import { query, queryOne, run, transaction } from '../db/sqlite.js'
import { updatePacketStatus }               from '../db/packets.js'
import { getCompany }                       from '../db/companies.js'
import { createEmployee, createBaseline }   from '../db/employees.js'
import { createTest, createHPDAssessment }  from '../db/tests.js'

export function renderImportConfirm(container, state, navigate) {
  const packetId = state.params?.packetId
  if (!packetId) { navigate('incoming'); return }

  const row = queryOne('SELECT value FROM settings WHERE key = ?', [`pending_packet_${packetId}`])
  if (!row) { navigate('incoming'); return }

  let packet
  try { packet = JSON.parse(row.value) } catch { navigate('incoming'); return }

  const isOffline = !!(packet._is_offline || packet.packet_id?.startsWith('OFFLINE-'))

  // Company resolution
  const company = getCompany(packet.company?.company_id) ??
                  queryOne('SELECT * FROM companies WHERE name = ?', [packet.company?.name])

  // Fuzzy matches for offline packets — companies with similar names
  const fuzzyMatches = isOffline && !company
    ? query(`SELECT * FROM companies WHERE active = 1 AND (
        name LIKE ? OR name LIKE ? OR ? LIKE '%' || name || '%'
      ) LIMIT 5`,
      [`%${packet.company?.name ?? ''}%`,
       `${packet.company?.name ?? ''}%`,
       packet.company?.name ?? ''])
    : []

  const employees      = packet.employees ?? []
  const tested         = employees.filter(e => e.completed_tests?.length > 0)
  const alreadyImported = query(
    'SELECT COUNT(*) AS n FROM tests WHERE packet_id = ?', [packetId]
  )[0]?.n ?? 0

  // State for company selection (offline packets)
  if (!state._importCoId && company) state._importCoId = company.company_id

  render()

  function render() {
    const resolvedCompany = state._importCoId
      ? queryOne('SELECT * FROM companies WHERE company_id = ?', [state._importCoId])
      : null
    const canImport = !!(resolvedCompany || (isOffline && state._importCoId === 'new'))

    container.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div class="breadcrumb">
            <button class="btn btn-link" id="btn-back">Incoming</button>
            <span>›</span>
            <span>Review Import</span>
          </div>
        </div>

        <div class="import-header">
          <div class="import-meta">
            <h2>${esc(packet.company?.name ?? 'Unknown Company')}</h2>
            <div class="meta-row">
              <span class="province-badge">${esc(packet.company?.province ?? '')}</span>
              <span>Visit: ${packet.visit?.visit_date ?? '—'}</span>
              <span>Tech: ${esc(packet.tech?.tech_id ?? '—')}</span>
              <span>Packet: ${esc(packet.packet_id)}</span>
              ${isOffline ? '<span class="badge badge-warn">📵 Offline Packet</span>' : ''}
            </div>
          </div>
          <div class="import-summary">
            <span class="import-count">${tested.length} / ${employees.length} employees tested</span>
          </div>
        </div>

        ${alreadyImported > 0 ? `
          <div class="alert alert-warn">
            ⚠ ${alreadyImported} test record${alreadyImported !== 1 ? 's' : ''} from this packet
            have already been imported. Importing again will create duplicate entries.
          </div>
        ` : ''}

        ${isOffline && !company ? `
          <div class="form-card" style="margin-bottom:16px">
            <div class="form-card-header">
              <h2>Company Match</h2>
            </div>
            <p style="font-size:13px;color:var(--grey-700);margin-bottom:12px">
              <strong>${esc(packet.company?.name)}</strong> is not in MasterDB.
              ${fuzzyMatches.length > 0
                ? 'Does this match an existing company?'
                : 'It will be created as a new company on import.'}
            </p>
            ${fuzzyMatches.length > 0 ? `
              <div class="nv-emp-list" style="margin-bottom:10px">
                ${fuzzyMatches.map(co => `
                  <label class="nv-emp-row" style="cursor:pointer">
                    <input type="radio" name="co-match" value="${co.company_id}"
                      ${state._importCoId === co.company_id ? 'checked' : ''}
                      style="margin-right:8px;accent-color:var(--navy-mid)" />
                    <div class="nv-emp-info">
                      <span class="nv-emp-name">${esc(co.name)}</span>
                      <span class="nv-emp-meta">${esc(co.province)}</span>
                    </div>
                  </label>
                `).join('')}
                <label class="nv-emp-row" style="cursor:pointer">
                  <input type="radio" name="co-match" value="new"
                    ${state._importCoId === 'new' || !state._importCoId ? 'checked' : ''}
                    style="margin-right:8px;accent-color:var(--navy-mid)" />
                  <div class="nv-emp-info">
                    <span class="nv-emp-name">Create as new company</span>
                    <span class="nv-emp-meta">${esc(packet.company?.name)}</span>
                  </div>
                </label>
              </div>
            ` : `
              <div class="alert alert-info">
                ✓ A new company "<strong>${esc(packet.company?.name)}</strong>" will be created
                in ${esc(packet.company?.province ?? '')} on import.
              </div>
            `}
          </div>
        ` : ''}

        <div class="import-results">
          ${tested.map(emp => empResultCard(emp, packet.company?.province)).join('')}
          ${employees.filter(e => !e.completed_tests?.length).map(e => `
            <div class="import-emp-row import-emp-row--skipped">
              <span>${esc(e.last_name)}, ${esc(e.first_name)}</span>
              <span class="td-muted">Not tested this visit</span>
            </div>
          `).join('')}
        </div>

        <div id="import-error"   class="alert alert-error   hidden"></div>
        <div id="import-success" class="alert alert-success hidden"></div>

        <div class="action-row">
          <button class="btn btn-ghost"   id="btn-cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-import"
            ${canImport ? '' : 'disabled'}
            ${alreadyImported > 0 ? 'style="background:var(--red)"' : ''}>
            ${alreadyImported > 0
              ? `Re-import ${tested.length} Test(s) — Creates Duplicates`
              : `Import ${tested.length} Test(s) into MasterDB`}
          </button>
        </div>
      </div>
    `

    container.querySelector('#btn-back').addEventListener('click', () => {
      state._importCoId = null
      navigate('incoming')
    })
    container.querySelector('#btn-cancel').addEventListener('click', () => {
      state._importCoId = null
      navigate('incoming')
    })

    // Wire radio buttons for company match
    container.querySelectorAll('input[name="co-match"]').forEach(radio => {
      radio.addEventListener('change', () => {
        state._importCoId = radio.value
        render()
      })
    })

    // Set default for "new" when no fuzzy matches
    if (isOffline && !company && fuzzyMatches.length === 0) {
      state._importCoId = 'new'
    }

    container.querySelector('#btn-import')?.addEventListener('click', () => {
      const resolvedCo = state._importCoId === 'new'
        ? null  // will create new company in doImport
        : queryOne('SELECT * FROM companies WHERE company_id = ?', [state._importCoId])
      doImport(container, packet, resolvedCo, packetId, isOffline, navigate, state)
    })
  }
}

function empResultCard(emp, province) {
  return emp.completed_tests.map(test => {
    const cls  = test.classification ?? null
    const cat  = cls?.category ?? '?'
    const hpd  = test.hpd_assessment
    const clsM = { N: 'n', EW: 'ew', A: 'a', NC: 'nc', EWC: 'ewc', AC: 'ac' }
    const clsL = { N: 'Normal', EW: 'Early Warning', A: 'Abnormal', NC: 'No Change', EWC: 'EW Change', AC: 'Abn Change' }
    return `
      <div class="import-emp-row">
        <div class="import-emp-info">
          <strong>${esc(emp.last_name)}, ${esc(emp.first_name)}</strong>
          <span class="td-muted">${test.test_type ?? 'Periodic'} · ${test.test_date}</span>
        </div>
        <div class="import-emp-result">
          <span class="class-badge class-${clsM[cat] ?? ''}">${clsL[cat] ?? cat}</span>
          ${hpd?.valid ? `<span class="class-badge class-${hpd.adequacy?.toLowerCase()}">${hpd.adequacy}</span>` : ''}
        </div>
        ${test.counsel_text ? `<div class="import-counsel">${esc(test.counsel_text.slice(0, 120))}${test.counsel_text.length > 120 ? '…' : ''}</div>` : ''}
      </div>
    `
  }).join('')
}

async function doImport(container, packet, company, packetId, isOffline, navigate, state) {
  const btn    = container.querySelector('#btn-import')
  const errEl  = container.querySelector('#import-error')
  const sucEl  = container.querySelector('#import-success')

  btn.disabled    = true
  btn.textContent = 'Importing…'
  errEl.classList.add('hidden')

  try {
    const province = packet.company?.province ?? 'BC'
    let   imported = 0
    let   resolvedCompany = company

    transaction(() => {

      // Create company if needed (offline packet, user chose "new")
      if (!resolvedCompany) {
        run(`INSERT INTO companies
          (name, province, address, contact_name, contact_phone, contact_email, sticky_notes, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            packet.company?.name     ?? '',
            packet.company?.province ?? province,
            packet.company?.address       ?? null,
            packet.company?.contact_name  ?? null,
            packet.company?.contact_phone ?? null,
            packet.company?.contact_email ?? null,
            packet.company?.sticky_notes  ?? null
          ]
        )
        resolvedCompany = queryOne(
          `SELECT * FROM companies WHERE name = ? LIMIT 1`,
          [packet.company?.name ?? '']
        )
        if (!resolvedCompany) throw new Error('Failed to create company record.')
      }

      for (const emp of packet.employees) {
        if (!emp.completed_tests?.length) continue

        // Find or create employee within resolved company
        let dbEmp = queryOne(
          `SELECT employee_id FROM employees
           WHERE company_id = ? AND first_name = ? AND last_name = ?`,
          [resolvedCompany.company_id, emp.first_name, emp.last_name]
        )

        if (!dbEmp) {
          run(`INSERT INTO employees
            (company_id, first_name, last_name, dob, hire_date, job_title, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              resolvedCompany.company_id,
              emp.first_name,
              emp.last_name,
              emp.dob        ?? null,
              emp.hire_date  ?? null,
              emp.job_title  ?? null,
              emp.status     ?? 'active'
            ]
          )
          dbEmp = queryOne(
            `SELECT employee_id FROM employees
             WHERE company_id = ? AND first_name = ? AND last_name = ? LIMIT 1`,
            [resolvedCompany.company_id, emp.first_name, emp.last_name]
          )
          if (!dbEmp) {
            console.warn(`Could not create employee: ${emp.last_name}, ${emp.first_name}`)
            return
          }
        }

        for (const test of emp.completed_tests) {
          // Prevention: Check if this specific test already exists in the database
          // (Same employee, date, and tech — within this or any other packet)
          const existingTest = queryOne(
            `SELECT test_id FROM tests 
             WHERE employee_id = ? AND test_date = ? AND tech_id = ?`,
            [dbEmp.employee_id, test.test_date, test.tech_id ?? packet.tech?.tech_id]
          )

          if (existingTest) {
            console.log(`Skipping duplicate test for ${emp.last_name} on ${test.test_date}`)
            continue
          }

          const testId = createTest({
            employee_id:              dbEmp.employee_id,
            test_date:                test.test_date,
            tech_id:                  test.tech_id ?? packet.tech?.tech_id,
            test_type:                test.test_type ?? 'Periodic',
            province,
            ...(test.thresholds ?? {}),
            classification:           test.classification,
            counsel_text:             test.counsel_text,
            tech_notes:               test.tech_notes,
            questionnaire:            test.questionnaire,
            referral_given_to_worker: test.referral_given_to_worker ?? 0,
            packet_id:                packet.packet_id
          })

          if (test.hpd_assessment?.valid) {
            createHPDAssessment(testId, test.hpd_assessment)
          }

          if (test.test_type === 'Baseline') {
            createBaseline(dbEmp.employee_id, test.test_date, test.thresholds ?? {})
          }

          imported++
        }
      }
    })

    updatePacketStatus(packetId, 'imported')
    run('DELETE FROM settings WHERE key = ?', [`pending_packet_${packetId}`])
    state._importCoId = null

    sucEl.textContent = `✓ Imported ${imported} test(s).`
    sucEl.classList.remove('hidden')
    btn.textContent = '✓ Imported'

    setTimeout(() => navigate('incoming'), 1800)
  } catch (e) {
    errEl.textContent = `Import failed: ${e.message}`
    errEl.classList.remove('hidden')
    btn.disabled    = false
    btn.textContent = 'Import Tests into MasterDB'
  }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
