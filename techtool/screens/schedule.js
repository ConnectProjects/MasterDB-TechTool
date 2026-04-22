import { getAllPackets, savePacket, packetExists }  from '../db/idb.js'
import { getSyncFolder, pickSyncFolder, listJsonFiles } from '@shared/fs/sync-folder.js'
import { PACKET_STATUS }                            from '@shared/packet/schema.js'

export function renderSchedule(container, state, navigate) {
  const user    = state.user
  const packets = state.packets ?? []
  const today   = new Date().toISOString().slice(0, 10)

  const sorted = [...packets].sort((a, b) =>
    (a.visit?.visit_date ?? '').localeCompare(b.visit?.visit_date ?? '')
  )

  container.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <h1 class="app-title">My Schedule</h1>
        <div class="header-right">
          <button class="btn btn-sm btn-outline" id="btn-sync">↓ Check for Packets</button>
          <button class="btn btn-sm btn-ghost"   id="btn-sync-status">⟳</button>
          <button class="btn btn-sm btn-ghost"   id="btn-settings">⚙</button>
          <span class="user-chip">${userName(user)}</span>
        </div>
      </header>

      <div id="sync-banner" class="hidden"></div>

      <main class="screen-body">
        ${sorted.length === 0
          ? `<div class="empty-state">
               <p>No packets on this device.</p>
               <p>Tap <strong>Check for Packets</strong> to load assignments from the sync folder.</p>
             </div>`
          : sorted.map(p => packetCard(p, today)).join('')
        }
      </main>
    </div>
  `

  container.querySelector('#btn-sync').addEventListener('click', () =>
    doSync(container, state, navigate)
  )
  container.querySelector('#btn-sync-status').addEventListener('click', () =>
    navigate('sync')
  )
  container.querySelector('#btn-settings').addEventListener('click', () =>
    navigate('settings')
  )

  attachCardHandlers(container, state, navigate)
}

// ---------------------------------------------------------------------------
// Packet card
// ---------------------------------------------------------------------------

function packetCard(packet, today) {
  const visitDate = packet.visit?.visit_date ?? ''
  const isToday   = visitDate === today
  const empCount  = packet.employees?.length ?? 0
  const doneCount = packet.employees?.filter(e => e.completed_tests?.length > 0).length ?? 0
  const dateLabel = visitDate
    ? new Date(visitDate + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'No date'

  let statusBadge
  if (doneCount > 0 && doneCount === empCount)
    statusBadge = `<span class="badge badge-success">Complete</span>`
  else if (doneCount > 0)
    statusBadge = `<span class="badge badge-warn">${doneCount}/${empCount} done</span>`
  else
    statusBadge = `<span class="badge badge-neutral">${empCount} employees</span>`

  return `
    <div class="packet-card ${isToday ? 'packet-card--today' : ''}" data-packet-id="${packet.packet_id}">
      <div class="packet-card__date">
        <span class="date-text">${dateLabel}</span>
        ${isToday ? '<span class="today-pill">TODAY</span>' : ''}
      </div>
      <div class="packet-card__body">
        <div class="packet-company">${packet.company?.name ?? 'Unknown'}</div>
        <div class="packet-meta">
          ${packet.company?.province ?? ''}&nbsp;·&nbsp;${statusBadge}
          ${packet.company?.sticky_notes ? '&nbsp;·&nbsp;<span class="sticky-flag">📌</span>' : ''}
        </div>
      </div>
      <div class="packet-card__arrow">›</div>
    </div>
  `
}

function attachCardHandlers(container, state, navigate) {
  container.querySelectorAll('.packet-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.packetId
      const packet = state.packets.find(p => p.packet_id === id)
      if (packet) navigate('company', { currentPacket: packet })
    })
  })
}

// ---------------------------------------------------------------------------
// Sync from folder
// ---------------------------------------------------------------------------

async function doSync(container, state, navigate) {
  const btn    = container.querySelector('#btn-sync')
  const banner = container.querySelector('#sync-banner')

  btn.disabled    = true
  btn.textContent = '↓ Checking…'
  showBanner(banner, 'info', 'Accessing sync folder…')

  try {
    // Re-authorize stored handle or pick new folder
    let folder = state.syncFolder
    if (!folder) {
      folder = await getSyncFolder()
      if (!folder) folder = await pickSyncFolder()
      state.syncFolder = folder
    }

    const folderName = state.user?.folder_name
    if (!folderName) {
      showBanner(banner, 'error', 'Sync folder name not set. Go to Settings and add your folder name.')
      return
    }

    const techSubfolder = `techs/${folderName}`
    showBanner(banner, 'info', `Scanning ${techSubfolder} for new packets…`)
    const files = await listJsonFiles(folder, techSubfolder)

    if (files.length === 0) {
      showBanner(banner, 'info', `No packets found in ${techSubfolder}.`)
      return
    }

    showBanner(banner, 'info', `Found ${files.length} packet(s) — checking…`)
    let loaded  = 0
    let skipped = 0
    for (const { name, handle } of files) {
      const file   = await handle.getFile()
      const packet = JSON.parse(await file.text())

      if (await packetExists(packet.packet_id)) {
        skipped++
        continue
      }

      showBanner(banner, 'info', `Loading ${name} (${loaded + 1}/${files.length - skipped})…`)
      packet.status = PACKET_STATUS.SYNCED
      await savePacket(packet)
      loaded++
    }

    state.packets  = await getAllPackets()
    state.lastSync = new Date().toLocaleString()

    const skipNote = skipped > 0 ? ` · ${skipped} already on device` : ''
    const msg      = loaded > 0
      ? `✓ ${loaded} new packet(s) loaded${skipNote} · ${state.lastSync}`
      : skipped > 0
        ? `All ${skipped} packet(s) already on device · ${state.lastSync}`
        : `No new packets · ${state.lastSync}`
    showBanner(banner, 'success', msg)

    // Refresh list in place
    const main   = container.querySelector('.screen-body')
    const today  = new Date().toISOString().slice(0, 10)
    const sorted = [...state.packets].sort((a, b) =>
      (a.visit?.visit_date ?? '').localeCompare(b.visit?.visit_date ?? '')
    )
    main.innerHTML = sorted.length === 0
      ? '<div class="empty-state"><p>No packets found.</p></div>'
      : sorted.map(p => packetCard(p, today)).join('')
    attachCardHandlers(container, state, navigate)
  } catch (e) {
    if (e.name !== 'AbortError') showBanner(banner, 'error', `Sync failed: ${e.message}`)
  } finally {
    btn.disabled    = false
    btn.textContent = '↓ Check for Packets'
  }
}

function showBanner(el, type, msg) {
  el.className   = `sync-banner alert alert-${type}`
  el.textContent = msg
  el.classList.remove('hidden')
}

function userName(user) {
  if (!user) return 'Tech'
  return user.name ?? user.initials ?? 'Tech'
}
