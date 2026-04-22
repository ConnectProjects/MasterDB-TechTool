import { setSetting, getAllPackets, savePacket } from '../db/idb.js'
import { pickSyncFolder } from '@shared/fs/sync-folder.js'
import { BrandLogo }      from '@shared/components/brand-logo.js'

export function renderLogin(container, state, navigate) {
  container.innerHTML = `
    <div class="screen screen-login">
      <div class="login-card">
        <div class="login-brand" style="background: #76B214; padding: 20px; border-radius: var(--radius); margin-bottom: 24px;">
          <div style="display: flex; justify-content: center;">
            ${BrandLogo}
          </div>
          <p class="login-sub" style="color: rgba(255,255,255,.8); margin-top: 10px;">Hearing Conservation Platform</p>
        </div>

        <div id="section-profile">
          <h2>First-Time Setup</h2>
          <p class="help-text">Enter your name and initials. These appear on all test records.</p>
          <div class="form-group">
            <label for="tt-name">Your Name</label>
            <input id="tt-name" type="text" placeholder="e.g. Nick Rossiter" autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="tt-initials">Short Name</label>
            <input id="tt-initials" type="text" placeholder="e.g. NORM" maxlength="6"
              style="width:120px; text-transform:uppercase" />
          </div>
          <div class="form-group">
            <label for="tt-folder">Sync Folder Name</label>
            <input id="tt-folder" type="text" placeholder="e.g. Norm" />
            <p class="help-text">Your first name — the office uses this for your packet folder on the shared drive.</p>
          </div>
          <button class="btn btn-primary btn-block" id="btn-save-profile">Save &amp; Continue</button>
        </div>

        <div id="section-folder" class="hidden">
          <p class="signin-prompt">Profile saved. Now select your sync folder.</p>
          <p class="help-text">
            Choose the <strong>ConnectHearing</strong> folder that the office has shared with you
            in OneDrive. It should appear in File Explorer under your OneDrive.
            You only need to do this once.
          </p>
          <button class="btn btn-primary btn-large btn-block" id="btn-pick-folder">
            Select ConnectHearing Folder
          </button>
        </div>

        <div id="login-error" class="alert alert-error hidden"></div>

        <div class="demo-divider">
          <button class="btn btn-link btn-sm" id="btn-demo">No sync folder — try Demo Mode</button>
        </div>
      </div>
    </div>
  `

  const errorEl = container.querySelector('#login-error')

  function showError(msg) {
    errorEl.textContent = msg
    errorEl.classList.remove('hidden')
  }

  // Step 1 — save tech profile
  container.querySelector('#btn-save-profile').addEventListener('click', async () => {
    const name        = container.querySelector('#tt-name').value.trim()
    const initials    = container.querySelector('#tt-initials').value.trim().toUpperCase()
    const folder_name = container.querySelector('#tt-folder').value.trim() || null

    if (!name)        { showError('Your name is required.');        return }
    if (!initials)    { showError('Your initials are required.');    return }
    if (!folder_name) { showError('Your sync folder name is required (e.g. your first name).'); return }

    errorEl.classList.add('hidden')
    await setSetting('tech_name',        name)
    await setSetting('tech_initials',    initials)
    await setSetting('tech_folder_name', folder_name)
    state.user = { name, initials, tech_id: initials, folder_name }

    container.querySelector('#section-profile').classList.add('hidden')
    container.querySelector('#section-folder').classList.remove('hidden')
  })

  // Step 2 — pick sync folder (separate user gesture keeps showDirectoryPicker happy)
  container.querySelector('#btn-pick-folder').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-pick-folder')
    btn.disabled    = true
    btn.textContent = 'Opening folder picker…'
    errorEl.classList.add('hidden')

    try {
      const handle     = await pickSyncFolder()
      state.syncFolder = handle
      state.packets    = await getAllPackets()
      navigate('dashboard')
    } catch (e) {
      if (e.name !== 'AbortError') showError(`Could not open folder: ${e.message}`)
      btn.disabled    = false
      btn.textContent = 'Select ConnectHearing Folder'
    }
  })

  // Demo mode — no sync folder needed
  container.querySelector('#btn-demo').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-demo')
    btn.textContent = 'Loading demo…'
    btn.disabled    = true
    errorEl.classList.add('hidden')

    try {
      const today = new Date().toISOString().slice(0, 10)

      const [rulesRes, counselRes] = await Promise.all([
        fetch('../shared/rules/AB.json'),
        fetch('../shared/counsel/AB.json')
      ])
      const { rules }              = await rulesRes.json()
      const { templates: counsel } = await counselRes.json()

      const packet = {
        packet_id:        'DEMO_' + Date.now(),
        status:           'synced',
        filename:         `DemoMining_${today}_DT.json`,
        created_at:       new Date().toISOString(),
        company: {
          company_id:    'demo',
          name:          'Demo Mining Corp.',
          province:      'AB',
          address:       '1 Industrial Park, Calgary AB',
          contact_name:  'Jane Smith',
          sticky_notes:  '📋 Demo packet — no real sync folder'
        },
        visit:            { visit_date: today },
        tech:             { tech_id: 'DT', name: 'Demo Tech', initials: 'DT' },
        rules,
        counsel_templates: counsel,
        hpd_inventory: [
          { make_model: '3M E-A-R Classic', nrr: 29, type: 'Earplug' },
          { make_model: 'Peltor Optime II', nrr: 30, type: 'Earmuff' }
        ],
        sticky_notes: '',
        employees: [
          {
            employee_id: 'EMP001',
            first_name:  'Alice',
            last_name:   'Bergeron',
            job_title:   'Equipment Operator',
            status:      'active',
            baseline: {
              test_date:  '2023-03-10',
              thresholds: {
                right_500: 15, right_1k: 15, right_2k: 20, right_3k: 25,
                right_4k:  30, right_6k:  30, right_8k: 25,
                left_500:  10, left_1k:   15, left_2k:  15, left_3k: 20,
                left_4k:   25, left_6k:   25, left_8k:  20
              }
            },
            prior_tests:     [],
            completed_tests: []
          },
          {
            employee_id: 'EMP002',
            first_name:  'Marco',
            last_name:   'Pelletier',
            job_title:   'Drill Operator',
            status:      'active',
            baseline:    null,
            prior_tests:     [],
            completed_tests: []
          },
          {
            employee_id: 'EMP003',
            first_name:  'Diane',
            last_name:   'Tremblay',
            job_title:   'Maintenance Tech',
            status:      'active',
            baseline: {
              test_date:  '2022-06-20',
              thresholds: {
                right_500: 20, right_1k: 25, right_2k: 30, right_3k: 35,
                right_4k:  40, right_6k:  45, right_8k: 35,
                left_500:  20, left_1k:   20, left_2k:  25, left_3k: 30,
                left_4k:   35, left_6k:   40, left_8k:  30
              }
            },
            prior_tests:     [],
            completed_tests: []
          }
        ]
      }

      await savePacket(packet)
      state.user    = { name: 'Demo Tech', initials: 'DT', tech_id: 'DT', folder_name: null }
      state.packets = [packet]
      navigate('dashboard')
    } catch (e) {
      btn.disabled    = false
      btn.textContent = 'No sync folder — try Demo Mode'
      showError(`Demo failed: ${e.message}`)
    }
  })
}
