import { getAllPackets, savePacket }                      from '../db/idb.js'
import { getSyncFolder, pickSyncFolder, writeJsonFile }   from '@shared/fs/sync-folder.js'
import { PACKET_STATUS, markSubmitted }                   from '@shared/packet/schema.js'

export function renderSync(container, state, navigate) {
  const packets = state.packets ?? []

  const pending = packets.filter(p =>
    p.employees?.some(e => e.completed_tests?.length > 0) &&
    p.status !== PACKET_STATUS.SUBMITTED &&
    p.status !== PACKET_STATUS.IMPORTED  &&
    p.status !== PACKET_STATUS.ARCHIVED
  )

  const folderReady = !!state.syncFolder

  container.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <button class="btn btn-ghost" id="btn-back">‹ Schedule</button>
        <h1 class="app-title">Submit Packets</h1>
      </header>

      <main class="screen-body">
        <div class="sync-status-card">
          <div class="status-row">
            <span>Sync folder</span>
            <span class="${folderReady ? 'status-online' : 'status-offline'}">
              ${folderReady ? '● Connected' : '○ Not connected'}
            </span>
          </div>
          <div class="status-row">
            <span>Last sync</span>
            <span>${state.lastSync ?? 'Never'}</span>
          </div>
          <div class="status-row">
            <span>Packets on device</span>
            <span>${packets.length}</span>
          </div>
          <div class="status-row">
            <span>Pending submission</span>
            <span>${pending.length}</span>
          </div>
        </div>

        ${pending.length > 0 ? `
          <div class="pending-section">
            <h2>Ready to Submit (${pending.length})</h2>
            ${pending.map(p => `
              <div class="pending-row">
                <span>${esc(p.company?.name ?? p.packet_id)}</span>
                <span class="muted">
                  ${p.employees?.filter(e => e.completed_tests?.length > 0).length} test(s)
                </span>
              </div>
            `).join('')}
            <button class="btn btn-primary btn-block" id="btn-upload">
              Save to Sync Folder
            </button>
          </div>
        ` : `
          <div class="empty-state">
            <p>No completed packets pending submission.</p>
          </div>
        `}

        <div id="sync-log" class="sync-log"></div>
      </main>
    </div>
  `

  container.querySelector('#btn-back').addEventListener('click', () => navigate('schedule'))

  container.querySelector('#btn-upload')?.addEventListener('click', () =>
    doUpload(container, state, navigate, pending)
  )
}

async function doUpload(container, state, navigate, pending) {
  const btn = container.querySelector('#btn-upload')
  const log = container.querySelector('#sync-log')
  btn.disabled    = true
  btn.textContent = 'Saving…'

  function addLog(msg, type = 'info') {
    const line = document.createElement('div')
    line.className   = `log-line log-${type}`
    line.textContent = `${new Date().toLocaleTimeString()} — ${msg}`
    log.appendChild(line)
    log.scrollTop = log.scrollHeight
  }

  try {
    // Get folder handle — re-authorize stored or pick new
    let folder = state.syncFolder
    if (!folder) {
      addLog('Requesting folder access…')
      folder = await getSyncFolder()
      if (!folder) folder = await pickSyncFolder()
      state.syncFolder = folder
    }

    let success = 0
    for (const packet of pending) {
      try {
        addLog(`Saving ${packet.company?.name ?? packet.packet_id}…`)
        markSubmitted(packet, state.user?.tech_id ?? 'unknown')
        await writeJsonFile(folder, 'inbox', packet.filename, packet)
        await savePacket(packet)
        success++
        addLog(`✓ ${packet.company?.name} saved to sync folder`, 'success')
      } catch (e) {
        addLog(`✕ ${packet.company?.name ?? packet.packet_id}: ${e.message}`, 'error')
      }
    }

    state.packets  = await getAllPackets()
    state.lastSync = new Date().toLocaleString()

    const allOk = success === pending.length
    addLog(`Done — ${success}/${pending.length} packet(s) saved.`, allOk ? 'success' : 'warn')
    addLog('The office can now import these from the ConnectHearing/inbox folder.', 'info')
  } catch (e) {
    if (e.name !== 'AbortError') addLog(`Failed: ${e.message}`, 'error')
  }

  btn.disabled    = false
  btn.textContent = 'Save to Sync Folder'
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
