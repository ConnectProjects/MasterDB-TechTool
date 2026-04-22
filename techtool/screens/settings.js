import { getSetting, setSetting, getAllPackets, deletePacket } from '../db/idb.js'
import { pickSyncFolder, readJsonFile } from '@shared/fs/sync-folder.js'
import { applyTheme, saveThemeColor, loadAndApplyTheme, DEFAULT_COLOR } from '../theme.js'

export function renderSettings(container, state, navigate) {
  container.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <h1 class="app-title">Settings</h1>
      </header>
      <main class="screen-body"><p class="muted">Loading…</p></main>
    </div>
  `

  Promise.all([
    getSetting('tech_name'),
    getSetting('tech_initials'),
    getSetting('tech_folder_name'),
    getSetting('tech_iat_number'),
    getSetting('ical_url'),
    getSetting('theme_color'),
    getSetting('logo_url'),
    getAllPackets()
  ]).then(([name, initials, folderName, iatNumber, icalUrl, themeColor, logoUrl, packets]) => {
    renderContent(container, state, navigate,
      name ?? '', initials ?? '', folderName ?? '', iatNumber ?? '',
      icalUrl ?? '', themeColor ?? DEFAULT_COLOR, logoUrl ?? null, packets ?? [])
  })
}

function renderContent(container, state, navigate,
  techName, techInitials, techFolderName, techIatNumber, icalUrl, themeColor, logoUrl, packets) {
  const folderReady = !!state.syncFolder

  const main = container.querySelector('.screen-body')
  main.innerHTML = `

    <!-- Profile -->
    <section class="settings-section">
      <h3>Your Profile</h3>
      <div class="form-group">
        <label>Name</label>
        <input id="s-name" type="text" value="${esc(techName)}" autocomplete="name" />
      </div>
      <div class="form-group">
        <label>Short Name</label>
        <input id="s-initials" type="text" value="${esc(techInitials)}"
          maxlength="6" style="width:110px;text-transform:uppercase" />
      </div>
      <div class="form-group">
        <label>Sync Folder Name</label>
        <input id="s-folder" type="text" value="${esc(techFolderName)}" placeholder="e.g. Norm" />
        <p class="help-text">Your first name — must match the folder name the office set up for you.</p>
      </div>
      <div class="form-group">
        <label>IAT Number</label>
        <input id="s-iat" type="text" value="${esc(techIatNumber)}" placeholder="e.g. IAT-12345" />
        <p class="help-text">Your Industrial Audiometric Technician certification number. Appears on referral forms.</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-save-profile">Save Profile</button>
      <div id="profile-msg" class="alert hidden" style="margin-top:8px"></div>
    </section>

    <!-- Sync folder -->
    <section class="settings-section">
      <h3>Sync Folder</h3>
      <p class="${folderReady ? 'status-online' : 'status-offline'}" id="folder-status-lbl">
        ${folderReady ? '● Sync folder connected' : '○ No sync folder selected'}
      </p>
      <button class="btn btn-outline btn-sm" id="btn-change-folder">
        ${folderReady ? 'Change Sync Folder' : 'Select Sync Folder'}
      </button>
      <div id="folder-msg" class="alert hidden" style="margin-top:8px"></div>
    </section>

    <!-- Calendar -->
    <section class="settings-section">
      <h3>Calendar (iCal URL)</h3>
      <div class="form-group">
        <label for="s-ical">iCal / .ics feed URL</label>
        <input id="s-ical" type="url" value="${esc(icalUrl)}"
          placeholder="https://calendar.google.com/…/basic.ics" autocomplete="off" />
        <p class="help-text">
          Paste a public iCal (.ics) URL to subscribe to your schedule.
          Google Calendar: Settings → share → "public address in iCal format".
          The URL must allow cross-origin requests.
        </p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" id="btn-save-ical">Save URL</button>
        <button class="btn btn-ghost btn-sm" id="btn-clear-ical">Clear</button>
      </div>
      <div id="ical-msg" class="alert hidden" style="margin-top:8px"></div>
    </section>

    <!-- Theme color -->
    <section class="settings-section">
      <h3>Theme Color</h3>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <input type="color" id="theme-color-input" value="${esc(themeColor)}"
          style="width:44px;height:36px;border:none;background:none;cursor:pointer;padding:0" />
        <span id="theme-color-hex" style="font-size:13px;font-family:monospace">${esc(themeColor)}</span>
        <button class="btn btn-ghost btn-sm" id="btn-reset-color">Reset to Default</button>
      </div>
      <div id="theme-msg" class="alert hidden" style="margin-top:8px"></div>
    </section>

    <!-- Company Logo -->
    <section class="settings-section">
      <h3>Company Logo</h3>
      ${logoUrl ? `
        <div class="logo-preview" style="margin-bottom:10px">
          <img src="${logoUrl}" style="max-width:180px;max-height:60px;object-fit:contain;display:block;filter:brightness(0) invert(1)" alt="Logo preview" />
        </div>
      ` : '<p class="muted" style="margin-bottom:8px">No logo loaded.</p>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-outline btn-sm" id="btn-sync-logo"
          ${folderReady ? '' : 'disabled'} title="${folderReady ? '' : 'Connect sync folder first'}">
          ↓ Sync Logo from Office
        </button>
        ${logoUrl ? `<button class="btn btn-ghost btn-sm" id="btn-remove-logo" style="color:var(--red)">Remove</button>` : ''}
      </div>
      <p class="help-text" style="margin-top:8px">
        Logo is set by the office in MasterDB and synced here automatically when you sync packets.
        Use the button above to pull it manually if it hasn't appeared yet.
      </p>
      <div id="logo-msg" class="alert hidden" style="margin-top:8px"></div>
    </section>

    <!-- Packets on device -->
    <section class="settings-section">
      <h3>Packets on Device (${packets.length})</h3>
      ${packets.length === 0
        ? '<p class="muted">No packets stored on this device.</p>'
        : `<div class="settings-packet-list">
            ${packets.map(p => `
              <div class="settings-packet-row">
                <div>
                  <div class="packet-company">${esc(p.company?.name ?? p.packet_id)}</div>
                  <div class="muted" style="font-size:12px">
                    ${p.visit?.visit_date ?? ''} &nbsp;·&nbsp; ${p.status ?? ''}
                    &nbsp;·&nbsp; ${(p.employees?.length ?? 0)} employees
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm btn-del-packet"
                  data-id="${esc(p.packet_id)}" style="color:var(--red)">
                  Delete
                </button>
              </div>
            `).join('')}
          </div>`
      }
    </section>

    <!-- Training -->
    <section class="settings-section">
      <h3>Training</h3>
      <p class="help-text">
        New to TechTool? Run the orientation to walk through a complete practice visit
        using a fictional company and employees. No real data is saved. You can redo it any time.
      </p>
      ${state.practiceCompleted ? `
        <p class="help-text" style="color:var(--green,#276749);margin-bottom:8px">
          ✓ You've completed this orientation before.
        </p>
      ` : ''}
      <button class="btn btn-outline btn-sm" id="btn-training">🎓 Open Orientation</button>
    </section>

    <!-- Reset -->
    <section class="settings-section" style="border-top:2px solid var(--red);margin-top:32px;padding-top:20px">
      <h3 style="color:var(--red)">Reset TechTool</h3>
      <p class="help-text">
        Clears all packets, drafts, your profile, and sync folder from this device.
        Use this when handing the device to another tech or setting up after a re-image.
        <strong>This cannot be undone.</strong>
      </p>
      <button class="btn btn-sm" id="btn-reset"
        style="color:var(--red);border:1px solid var(--red);background:transparent;padding:6px 14px;border-radius:var(--radius);cursor:pointer">
        Reset TechTool…
      </button>
    </section>
  `

  // ---- iCal URL ----
  container.querySelector('#btn-save-ical').addEventListener('click', async () => {
    const raw = container.querySelector('#s-ical').value.trim()
    const msg = container.querySelector('#ical-msg')
    const url = raw.replace(/^webcals?:\/\//i, 'https://')
    if (url !== raw) container.querySelector('#s-ical').value = url
    await setSetting('ical_url', url)
    showMsg(msg, 'success', '✓ Calendar URL saved.' + (url !== raw ? ' (webcal:// converted to https://)' : ''))
  })

  container.querySelector('#btn-clear-ical').addEventListener('click', async () => {
    container.querySelector('#s-ical').value = ''
    await setSetting('ical_url', '')
    showMsg(container.querySelector('#ical-msg'), 'success', '✓ Calendar URL cleared.')
  })

  // ---- Theme color ----
  const colorInput = container.querySelector('#theme-color-input')
  const colorHex   = container.querySelector('#theme-color-hex')

  colorInput.addEventListener('input', () => {
    const hex = colorInput.value
    colorHex.textContent = hex
    applyTheme(hex)
  })

  colorInput.addEventListener('change', async () => {
    await saveThemeColor(colorInput.value)
    showMsg(container.querySelector('#theme-msg'), 'success', '✓ Theme color saved.')
  })

  container.querySelector('#btn-reset-color').addEventListener('click', async () => {
    colorInput.value     = DEFAULT_COLOR
    colorHex.textContent = DEFAULT_COLOR
    applyTheme(DEFAULT_COLOR)
    await saveThemeColor(DEFAULT_COLOR)
    showMsg(container.querySelector('#theme-msg'), 'success', '✓ Reset to default color.')
  })

  // ---- Sync logo from office ----
  container.querySelector('#btn-sync-logo')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-sync-logo')
    const msg = container.querySelector('#logo-msg')
    btn.disabled    = true
    btn.textContent = '↓ Syncing…'
    try {
      const data = await readJsonFile(state.syncFolder, '', 'logo.json')
      if (!data?.logo_url) throw new Error('No logo found in sync folder.')
      await setSetting('logo_url', data.logo_url)
      state.logoUrl = data.logo_url
      navigate('settings')
    } catch (e) {
      showMsg(msg, 'error', `Could not load logo: ${e.message}`)
      btn.disabled    = false
      btn.textContent = '↓ Sync Logo from Office'
    }
  })

  container.querySelector('#btn-remove-logo')?.addEventListener('click', async () => {
    await setSetting('logo_url', null)
    state.logoUrl = null
    navigate('settings')
  })

  // ---- Save profile ----
  container.querySelector('#btn-save-profile').addEventListener('click', async () => {
    const name        = container.querySelector('#s-name').value.trim()
    const initials    = container.querySelector('#s-initials').value.trim().toUpperCase()
    const folder_name = container.querySelector('#s-folder').value.trim() || null
    const iat_number  = container.querySelector('#s-iat').value.trim() || null
    const msg         = container.querySelector('#profile-msg')
    if (!name || !initials) {
      showMsg(msg, 'error', 'Name and initials are required.')
      return
    }
    await setSetting('tech_name',        name)
    await setSetting('tech_initials',    initials)
    await setSetting('tech_folder_name', folder_name ?? '')
    await setSetting('tech_iat_number',  iat_number  ?? '')
    state.user = { name, initials, tech_id: initials, folder_name, iat_number }
    showMsg(msg, 'success', '✓ Profile saved.')
  })

  // ---- Change sync folder ----
  container.querySelector('#btn-change-folder').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-change-folder')
    const msg = container.querySelector('#folder-msg')
    btn.disabled    = true
    btn.textContent = 'Opening…'
    try {
      const handle     = await pickSyncFolder()
      state.syncFolder = handle
      container.querySelector('#folder-status-lbl').textContent = '● Sync folder connected'
      container.querySelector('#folder-status-lbl').className   = 'status-online'
      btn.textContent = 'Change Sync Folder'
      showMsg(msg, 'success', '✓ Sync folder updated.')
      const logoBtn = container.querySelector('#btn-sync-logo')
      if (logoBtn) logoBtn.disabled = false
    } catch (e) {
      if (e.name !== 'AbortError') showMsg(msg, 'error', `Could not open folder: ${e.message}`)
      btn.textContent = state.syncFolder ? 'Change Sync Folder' : 'Select Sync Folder'
    }
    btn.disabled = false
  })

  // ---- Training ----
  container.querySelector('#btn-training').addEventListener('click', () => navigate('training'))

  // ---- Delete individual packet ----
  container.querySelectorAll('.btn-del-packet').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      if (!confirm('Delete this packet from the device?\n\nNote: submitted packets are already saved to the sync folder.')) return
      await deletePacket(id)
      state.packets = await getAllPackets()
      navigate('settings')
    })
  })

  // ---- Reset ----
  container.querySelector('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Reset TechTool?\n\nThis will delete all packets, your profile, and sync folder settings from this device. This cannot be undone.')) return
    if (!confirm('Are you absolutely sure? All local data will be permanently deleted.')) return
    await deleteIDB('hcp-techtool')
    await deleteIDB('hcp-fs-handles')
    window.location.reload()
  })
}

// ---------------------------------------------------------------------------
// Shared logo sync utility — called from dashboard.js doSync() as well
// ---------------------------------------------------------------------------

/**
 * Silently attempt to load logo.json from the sync folder root.
 * If found and different from current, saves to IDB and updates state.
 * Returns true if the logo was updated, false otherwise.
 */
export async function syncLogoFromFolder(folder, state) {
  if (!folder) return false
  try {
    const data = await readJsonFile(folder, '', 'logo.json')
    if (!data?.logo_url) return false
    if (data.logo_url === state.logoUrl) return false  // already up to date

    const { setSetting } = await import('../db/idb.js')
    await setSetting('logo_url', data.logo_url)
    state.logoUrl = data.logo_url
    return true
  } catch {
    return false  // logo.json doesn't exist yet — not an error
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deleteIDB(name) {
  return new Promise(resolve => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = resolve
    req.onerror   = resolve
    req.onblocked = resolve
  })
}

function showMsg(el, type, msg) {
  el.className   = `alert alert-${type}`
  el.textContent = msg
  el.classList.remove('hidden')
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
