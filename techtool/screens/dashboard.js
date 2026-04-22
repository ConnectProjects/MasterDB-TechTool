import { getAllPackets, savePacket, packetExists } from '../db/idb.js'
import { getSyncFolder, pickSyncFolder, listJsonFiles } from '@shared/fs/sync-folder.js'
import { PACKET_STATUS } from '@shared/packet/schema.js'
import { syncLogoFromFolder } from './settings.js'

export async function renderDashboard(container, state, navigate) {
  const today   = new Date().toISOString().slice(0, 10)
  const packets = state.packets ?? []
  const user    = state.user

  const todayPackets = packets.filter(p => p.visit?.visit_date === today)
  const upcoming     = packets
    .filter(p => (p.visit?.visit_date ?? '') > today)
    .sort((a, b) => (a.visit?.visit_date ?? '').localeCompare(b.visit?.visit_date ?? ''))
    .slice(0, 5)

  const totalToday  = todayPackets.reduce((n, p) => n + (p.employees?.length ?? 0), 0)
  const testedToday = todayPackets.reduce((n, p) =>
    n + (p.employees?.filter(e => (e.completed_tests?.length ?? 0) > 0).length ?? 0), 0)

  const greeting  = getGreeting()
  const firstName = user?.name?.split(' ')[0] ?? user?.initials ?? 'there'
  const dateLabel = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  container.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <h1 class="app-title">Dashboard</h1>
        <div class="header-right">
          <button class="btn btn-sm btn-outline" id="btn-sync">↓ Sync</button>
          <button class="btn btn-sm btn-ghost"   id="btn-schedule">☰</button>
          <button class="btn btn-sm btn-ghost"   id="btn-settings">⚙</button>
          <span class="user-chip">${esc(firstName)}</span>
        </div>
      </header>

      <div id="sync-banner" class="sync-banner hidden"></div>

      <main class="screen-body dash-body">

        <div class="dash-greeting">
          <div class="dash-greeting-line">${greeting}, <strong>${esc(firstName)}</strong>.</div>
          <div class="dash-date">${dateLabel}</div>
        </div>

        <section class="dash-section">
          <div class="dash-section-head">
            <h2 class="dash-section-title">Today</h2>
            ${totalToday > 0
              ? `<span class="dash-count-chip ${testedToday === totalToday ? 'chip-done' : ''}">${testedToday} / ${totalToday} tested</span>`
              : ''}
          </div>
          ${todayPackets.length === 0
            ? `<div class="dash-empty">
                 <p>No assignments scheduled for today.</p>
                 <button class="btn btn-primary btn-sm" id="btn-sync-today">↓ Check for Packets</button>
               </div>`
            : todayPackets.map(p => todayCard(p)).join('')
          }
        </section>

        ${upcoming.length > 0 ? `
          <section class="dash-section">
            <div class="dash-section-head">
              <h2 class="dash-section-title">Upcoming</h2>
              <button class="btn btn-ghost btn-sm" id="btn-view-all"
                style="color:var(--blue-mid);padding:4px 8px">View all →</button>
            </div>
            <div class="dash-upcoming-list">
              ${upcoming.map(p => upcomingRow(p)).join('')}
            </div>
          </section>
        ` : ''}

        ${packets.length === 0 ? `
          <div class="empty-state">
            <p>No packets on this device yet.</p>
            <p style="font-size:13px;margin-top:6px">Tap <strong>Sync</strong> to load your assignments.</p>
          </div>
        ` : ''}

      </main>
    </div>
  `

  container.querySelectorAll('.dash-today-card').forEach(card => {
    card.addEventListener('click', () => {
      const packet = state.packets.find(p => p.packet_id === card.dataset.packetId)
      if (packet) navigate('company', { currentPacket: packet })
    })
  })

  container.querySelectorAll('.dash-upcoming-row').forEach(row => {
    row.addEventListener('click', () => {
      const packet = state.packets.find(p => p.packet_id === row.dataset.packetId)
      if (packet) navigate('company', { currentPacket: packet })
    })
  })

  const syncFn = () => doSync(container, state, navigate)
  container.querySelector('#btn-sync')?.addEventListener('click', syncFn)
  container.querySelector('#btn-sync-today')?.addEventListener('click', syncFn)
  container.querySelector('#btn-schedule')?.addEventListener('click', () => navigate('schedule'))
  container.querySelector('#btn-view-all')?.addEventListener('click', () => navigate('schedule'))
  container.querySelector('#btn-settings')?.addEventListener('click', () => navigate('settings'))
}

// ---------------------------------------------------------------------------
// Card / row builders
// ---------------------------------------------------------------------------

function todayCard(p) {
  const empCount  = p.employees?.length ?? 0
  const doneCount = p.employees?.filter(e => (e.completed_tests?.length ?? 0) > 0).length ?? 0
  const pct       = empCount > 0 ? Math.round((doneCount / empCount) * 100) : 0
  const allDone   = empCount > 0 && doneCount === empCount

  return `
    <div class="dash-today-card ${allDone ? 'dash-today-card--done' : ''}"
         data-packet-id="${p.packet_id}">
      <div class="dash-today-main">
        <div class="dash-today-company">${esc(p.company?.name ?? 'Unknown')}</div>
        <div class="dash-today-meta">${esc(p.company?.province ?? '')} · ${doneCount} of ${empCount} tested</div>
      </div>
      <div class="dash-prog-wrap">
        <div class="dash-prog-bar">
          <div class="dash-prog-fill ${allDone ? 'dash-prog-fill--done' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="dash-prog-label ${allDone ? 'dash-prog-label--done' : ''}">${allDone ? '✓ Done' : `${pct}%`}</span>
      </div>
      <span class="dash-card-arrow">›</span>
    </div>
  `
}

function upcomingRow(p) {
  const visitDate = p.visit?.visit_date ?? ''
  const dateLabel = visitDate
    ? new Date(visitDate + 'T12:00:00').toLocaleDateString('en-CA', {
        weekday: 'short', month: 'short', day: 'numeric'
      })
    : '—'
  const empCount = p.employees?.length ?? 0

  return `
    <div class="dash-upcoming-row" data-packet-id="${p.packet_id}">
      <span class="dash-upcoming-date">${dateLabel}</span>
      <span class="dash-upcoming-company">${esc(p.company?.name ?? 'Unknown')}</span>
      <span class="dash-upcoming-count">${empCount} emp</span>
      <span class="dash-upcoming-arrow">›</span>
    </div>
  `
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

async function doSync(container, state, navigate) {
  const btn    = container.querySelector('#btn-sync')
  const banner = container.querySelector('#sync-banner')
  if (btn) { btn.disabled = true; btn.textContent = '↓ Syncing…' }
  showBanner(banner, 'info', 'Accessing sync folder…')

  try {
    let folder = state.syncFolder
    if (!folder) {
      folder = await getSyncFolder()
      if (!folder) folder = await pickSyncFolder()
      state.syncFolder = folder
    }

    const folderName = state.user?.folder_name
    if (!folderName) {
      showBanner(banner, 'error', 'Sync folder name not set — go to Settings and add your folder name.')
      return
    }

    const techSubfolder = `techs/${folderName}`
    showBanner(banner, 'info', `Scanning ${techSubfolder}…`)
    const files = await listJsonFiles(folder, techSubfolder)

    if (files.length === 0) {
      showBanner(banner, 'info', `No packets found in ${techSubfolder}.`)
      return
    }

    let loaded = 0, skipped = 0
    for (const { name, handle } of files) {
      const file   = await handle.getFile()
      const packet = JSON.parse(await file.text())
      if (await packetExists(packet.packet_id)) { skipped++; continue }
      packet.status = PACKET_STATUS.SYNCED
      await savePacket(packet)
      loaded++
    }

    state.packets  = await getAllPackets()
    state.lastSync = new Date().toLocaleString()

    // Silently sync logo from office if one has been published
    await syncLogoFromFolder(folder, state)

    const skipNote = skipped > 0 ? ` · ${skipped} already on device` : ''
    const msg = loaded > 0
      ? `✓ ${loaded} new packet(s) loaded${skipNote}`
      : skipped > 0 ? `All ${skipped} packet(s) already on device` : 'No new packets'
    showBanner(banner, 'success', `${msg} · ${state.lastSync}`)

    navigate('dashboard')
  } catch (e) {
    if (e.name !== 'AbortError') showBanner(banner, 'error', `Sync failed: ${e.message}`)
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↓ Sync' }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function showBanner(el, type, msg) {
  if (!el) return
  el.className   = `sync-banner alert alert-${type}`
  el.textContent = msg
  el.classList.remove('hidden')
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
