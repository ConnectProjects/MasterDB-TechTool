import { query, queryOne } from '../db/sqlite.js'
import { getAllCompanies }  from '../db/companies.js'
import { renderAudiogram }  from '../components/audiogram.js'

export function renderReports(container, state, navigate) {
  const companies = getAllCompanies()
  const tab       = state.reportTab ?? 'company'
  const yr        = new Date().getFullYear()
  const today     = new Date().toISOString().slice(0, 10)
  const yrStart   = `${yr}-01-01`

  const coOptions = companies.map(c =>
    `<option value="${c.company_id}">${esc(c.name)} (${esc(c.province)})</option>`
  ).join('')

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>Reports</h1>
        <button class="btn btn-outline btn-sm" id="btn-print" hidden>Print / Save as PDF</button>
      </div>

      <div class="tab-bar">
        <button class="tab-btn ${tab === 'company'  ? 'tab-btn--active' : ''}" data-tab="company">Company Annual</button>
        <button class="tab-btn ${tab === 'employee' ? 'tab-btn--active' : ''}" data-tab="employee">Employee History</button>
        <button class="tab-btn ${tab === 'sts'      ? 'tab-btn--active' : ''}" data-tab="sts">STS / Flagged</button>
      </div>

      <div class="report-controls">
        ${tab === 'company' ? `
          <div class="inline-form">
            <div class="form-group">
              <label>Company</label>
              <select id="rc-company"><option value="">— select —</option>${coOptions}</select>
            </div>
            <div class="form-group">
              <label>Year</label>
              <input id="rc-year" type="number" value="${yr}" min="2010" max="${yr + 1}" style="width:90px" />
            </div>
            <button class="btn btn-primary btn-sm" id="btn-gen" style="align-self:flex-end;margin-bottom:1px">Generate</button>
            <button class="btn btn-outline btn-sm" id="btn-export-xlsx" style="align-self:flex-end;margin-bottom:1px">Export Excel (.xlsx)</button>
          </div>
        ` : ''}
        ${tab === 'employee' ? `
          <div class="inline-form">
            <div class="form-group">
              <label>Company</label>
              <select id="re-company"><option value="">— select —</option>${coOptions}</select>
            </div>
            <div class="form-group">
              <label>Employee</label>
              <select id="re-employee"><option value="">— select company first —</option></select>
            </div>
            <button class="btn btn-primary btn-sm" id="btn-gen" style="align-self:flex-end;margin-bottom:1px">Generate</button>
          </div>
        ` : ''}
        ${tab === 'sts' ? `
          <div class="inline-form">
            <div class="form-group">
              <label>Company</label>
              <select id="rs-company"><option value="">— select —</option>${coOptions}</select>
            </div>
            <div class="form-group">
              <label>From</label>
              <input id="rs-from" type="date" value="${yrStart}" />
            </div>
            <div class="form-group">
              <label>To</label>
              <input id="rs-to" type="date" value="${today}" />
            </div>
            <button class="btn btn-primary btn-sm" id="btn-gen" style="align-self:flex-end;margin-bottom:1px">Generate</button>
          </div>
        ` : ''}
      </div>

      <div id="report-preview" class="report-preview"></div>
    </div>
  `

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => { state.reportTab = btn.dataset.tab; navigate('reports') })
  )

  const printBtn = container.querySelector('#btn-print')
  printBtn.addEventListener('click', () => window.print())

  const preview = container.querySelector('#report-preview')
  function showReport(html) { preview.innerHTML = html; printBtn.hidden = false }

  // ---- Company Annual ----
  if (tab === 'company') {
    container.querySelector('#btn-gen').addEventListener('click', () => {
      const companyId = Number(container.querySelector('#rc-company').value)
      const year      = container.querySelector('#rc-year').value
      if (!companyId || !year) { alert('Select a company and year.'); return }
      showReport(buildCompanyReport(companyId, year))
    })

    container.querySelector('#btn-export-xlsx').addEventListener('click', () => {
      const companyId = Number(container.querySelector('#rc-company').value)
      const year      = container.querySelector('#rc-year').value
      if (!companyId || !year) { alert('Select a company and year.'); return }
      exportCompanyXlsx(companyId, year)
    })
  }

  // ---- Employee History ----
  if (tab === 'employee') {
    const companySelect  = container.querySelector('#re-company')
    const employeeSelect = container.querySelector('#re-employee')

    companySelect.addEventListener('change', () => {
      const cid = companySelect.value
      if (!cid) { employeeSelect.innerHTML = '<option value="">— select company first —</option>'; return }
      const emps = query(
        "SELECT employee_id, first_name, last_name FROM employees WHERE company_id = ? AND status = 'active' ORDER BY last_name, first_name",
        [Number(cid)]
      )
      employeeSelect.innerHTML = '<option value="">— select —</option>' +
        emps.map(e => `<option value="${e.employee_id}">${esc(e.last_name)}, ${esc(e.first_name)}</option>`).join('')
    })

    container.querySelector('#btn-gen').addEventListener('click', () => {
      const employeeId = Number(employeeSelect.value)
      if (!employeeId) { alert('Select an employee.'); return }
      showReport(buildEmployeeReport(employeeId))
    })
  }

  // ---- STS / Flagged ----
  if (tab === 'sts') {
    container.querySelector('#btn-gen').addEventListener('click', () => {
      const companyId = Number(container.querySelector('#rs-company').value)
      const from      = container.querySelector('#rs-from').value
      const to        = container.querySelector('#rs-to').value
      if (!companyId || !from || !to) { alert('Fill in all fields.'); return }
      showReport(buildStsReport(companyId, from, to))
    })
  }
}

// ---------------------------------------------------------------------------
// Company Annual Report
// ---------------------------------------------------------------------------

function buildCompanyReport(companyId, year) {
  const co = queryOne('SELECT * FROM companies WHERE company_id = ?', [companyId])
  if (!co) return '<p class="alert alert-error">Company not found.</p>'

  const rows = query(`
    SELECT e.employee_id, e.first_name, e.last_name, e.hire_date, e.job_title,
           t.test_id, t.test_date, t.test_type, t.classification, t.sts_flag, t.tech_id
    FROM employees e
    LEFT JOIN tests t ON t.test_id = (
      SELECT test_id FROM tests
      WHERE employee_id = e.employee_id AND test_date LIKE ?
      ORDER BY test_date DESC LIMIT 1
    )
    WHERE e.company_id = ? AND e.status = 'active'
    ORDER BY e.last_name, e.first_name
  `, [`${year}-%`, companyId])

  const tested = rows.filter(r => r.test_id != null)
  const counts = { N: 0, NC: 0, EW: 0, EWC: 0, A: 0, AC: 0 }
  for (const r of tested) {
    const cat = parseCat(r.classification)
    if (cat in counts) counts[cat]++
  }

  const tableRows = rows.map(r => {
    const cat = parseCat(r.classification)
    return `<tr>
      <td>${esc(r.last_name)}, ${esc(r.first_name)}</td>
      <td>${r.job_title ? esc(r.job_title) : '—'}</td>
      <td>${r.hire_date ?? '—'}</td>
      <td>${r.test_date ?? '<span style="color:#aaa">—</span>'}</td>
      <td>${r.test_type ?? '—'}</td>
      <td>${r.test_id ? catBadge(cat) : '—'}</td>
    </tr>`
  }).join('')

  const genDate = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  return `
    <div class="report-print">
      <div class="report-header">
        <div>
          <div class="report-brand">HCP-Web · MasterDB</div>
          <h1 class="report-title">Annual Hearing Test Report — ${year}</h1>
          <div class="report-meta">${esc(co.name)} · Province: ${esc(co.province)} · Generated ${genDate}</div>
        </div>
      </div>

      <div class="report-stats-row">
        <div class="report-stat">
          <span class="stat-n">${rows.length}</span>
          <span class="stat-lbl">Active Employees</span>
        </div>
        <div class="report-stat">
          <span class="stat-n">${tested.length}</span>
          <span class="stat-lbl">Tested ${year}</span>
        </div>
        <div class="report-stat">
          <span class="stat-n">${counts.N + counts.NC}</span>
          <span class="stat-lbl">Normal / No Change</span>
        </div>
        <div class="report-stat report-stat--ew">
          <span class="stat-n">${counts.EW + counts.EWC}</span>
          <span class="stat-lbl">Early Warning</span>
        </div>
        <div class="report-stat report-stat--abn">
          <span class="stat-n">${counts.A + counts.AC}</span>
          <span class="stat-lbl">Abnormal</span>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>Employee</th><th>Job Title</th><th>Hire Date</th>
            <th>Test Date</th><th>Type</th><th>Result</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="report-footer">
        ${esc(co.name)} — ${esc(co.province)} Hearing Conservation Program · ${year} Annual Report
      </div>
    </div>
  `
}

// ---------------------------------------------------------------------------
// Employee History Report
// ---------------------------------------------------------------------------

function buildEmployeeReport(employeeId) {
  const emp = queryOne(`
    SELECT e.*, c.name AS company_name, c.province
    FROM employees e JOIN companies c ON c.company_id = e.company_id
    WHERE e.employee_id = ?
  `, [employeeId])
  if (!emp) return '<p class="alert alert-error">Employee not found.</p>'

  const baseline = queryOne(
    'SELECT * FROM baselines WHERE employee_id = ? AND archived = 0 ORDER BY test_date DESC LIMIT 1',
    [employeeId]
  )
  const tests = query(`
    SELECT t.*, h.hpd_make_model, h.rated_nrr, h.derated_nrr, h.lex8hr, h.protected_exposure, h.adequacy
    FROM tests t
    LEFT JOIN hpd_assessments h ON h.test_id = t.test_id
    WHERE t.employee_id = ?
    ORDER BY t.test_date DESC
  `, [employeeId])

  const latest  = tests[0] ?? null
  const gram    = latest
    ? renderAudiogram({ current: latest, baseline: baseline ?? null })
    : '<p style="color:#999;font-size:13px">No test data available.</p>'

  const testRows = tests.map(t => {
    const cat     = parseCat(t.classification)
    const q       = t.questionnaire ? parseJson(t.questionnaire) : null
    const hpdText = t.adequacy
      ? `${esc(t.adequacy)}${t.derated_nrr != null ? ` (${t.derated_nrr} dB)` : ''}`
      : '—'
    
    const qLabels = []
    if (q?.pre) {
      if (q.pre.noise_2hrs) qLabels.push(`Noise < 2h (${q.pre.noise_duration})`)
      if (q.pre.wear_hpd) qLabels.push(`Wears HPD`)
      if (q.pre.employer_info) qLabels.push(`Emp Info`)
    }
    const qText = qLabels.length > 0 ? qLabels.join(', ') : '—'

    return `<tr>
      <td>${t.test_date}</td>
      <td>${esc(t.test_type)}</td>
      <td>${catBadge(cat)}</td>
      <td>${esc(t.tech_id ?? '—')}</td>
      <td>${hpdText}</td>
      <td>${qText}</td>
      <td style="max-width:180px;font-size:11px;line-height:1.3">${t.tech_notes ? esc(t.tech_notes) : '—'}</td>
    </tr>`
  }).join('')

  const latestCounsel = tests.find(t => t.counsel_text)?.counsel_text ?? null
  const genDate = new Date().toLocaleDateString('en-CA')

  return `
    <div class="report-print">
      <div class="report-header">
        <div>
          <div class="report-brand">HCP-Web · MasterDB</div>
          <h1 class="report-title">Employee Hearing History</h1>
          <div class="report-meta">${esc(emp.company_name)} · Province: ${esc(emp.province)}</div>
        </div>
      </div>

      <div class="report-emp-info">
        <div class="report-emp-name">${esc(emp.last_name)}, ${esc(emp.first_name)}</div>
        <div class="report-emp-details">
          ${emp.job_title ? `${esc(emp.job_title)} &nbsp;·&nbsp; ` : ''}
          ${emp.hire_date ? `Hired: ${emp.hire_date} &nbsp;·&nbsp; ` : ''}
          ${emp.dob ? `DOB: ${emp.dob} &nbsp;·&nbsp; ` : ''}
          Province: ${esc(emp.province)}
        </div>
        <div class="report-emp-details">
          ${baseline
            ? `Baseline established: ${baseline.test_date}`
            : '<em style="color:#999">No baseline on record</em>'}
        </div>
      </div>

      <div class="report-audiogram-wrap">${gram}</div>

      ${tests.length > 0 ? `
        <div class="report-section-label">Test History (${tests.length} record${tests.length !== 1 ? 's' : ''})</div>
        <table class="report-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Result</th><th>Tech</th><th>HPD</th><th>Survey</th><th>Tech Notes</th></tr>
          </thead>
          <tbody>${testRows}</tbody>
        </table>
      ` : '<p style="color:#999;font-size:13px;margin-top:16px">No tests on record.</p>'}

      ${latestCounsel ? `
        <div class="report-counsel-box">
          <div class="report-section-label">Most Recent Counsel Summary</div>
          <p style="font-size:13px;line-height:1.65;white-space:pre-line;margin:0">${esc(latestCounsel)}</p>
        </div>
      ` : ''}

      <div class="report-footer">
        ${esc(emp.last_name)}, ${esc(emp.first_name)} — ${esc(emp.company_name)} Hearing History — ${genDate}
      </div>
    </div>
  `
}

// ---------------------------------------------------------------------------
// STS / Flagged Report
// ---------------------------------------------------------------------------

function buildStsReport(companyId, from, to) {
  const co = queryOne('SELECT * FROM companies WHERE company_id = ?', [companyId])
  if (!co) return '<p class="alert alert-error">Company not found.</p>'

  const rows = query(`
    SELECT t.test_id, t.test_date, t.test_type, t.classification,
           t.triggering_ear, t.triggering_freq_hz, t.shift_db,
           t.counsel_text, t.tech_id,
           e.first_name, e.last_name, e.job_title,
           h.adequacy AS hpd_adequacy, h.derated_nrr
    FROM tests t
    JOIN employees e ON e.employee_id = t.employee_id
    LEFT JOIN hpd_assessments h ON h.test_id = t.test_id
    WHERE e.company_id = ? AND t.test_date BETWEEN ? AND ? AND t.sts_flag = 1
    ORDER BY t.test_date DESC, e.last_name, e.first_name
  `, [companyId, from, to])

  const cards = rows.map(r => {
    const cat    = parseCat(r.classification)
    const detail = [
      r.triggering_ear    ? `${r.triggering_ear} ear`    : null,
      r.triggering_freq_hz ? `${r.triggering_freq_hz} Hz` : null,
      r.shift_db != null  ? `${r.shift_db} dB shift`    : null
    ].filter(Boolean).join(' · ')

    return `
      <div class="report-sts-card">
        <div class="report-sts-top">
          <div>
            <strong>${esc(r.last_name)}, ${esc(r.first_name)}</strong>
            ${r.job_title ? `<span class="td-muted"> · ${esc(r.job_title)}</span>` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${catBadge(cat)}
            <span style="font-size:12px;color:#666">${r.test_date} · ${esc(r.test_type)}</span>
          </div>
        </div>
        ${detail ? `<div class="report-sts-detail">${detail}</div>` : ''}
        ${r.hpd_adequacy ? `<div class="report-sts-detail">HPD: ${esc(r.hpd_adequacy)}${r.derated_nrr != null ? ` (derated NRR: ${r.derated_nrr} dB)` : ''}</div>` : ''}
        ${r.counsel_text ? `<div class="report-sts-counsel">${esc(r.counsel_text.slice(0, 220))}${r.counsel_text.length > 220 ? '…' : ''}</div>` : ''}
      </div>
    `
  }).join('')

  const genDate = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  return `
    <div class="report-print">
      <div class="report-header">
        <div>
          <div class="report-brand">HCP-Web · MasterDB</div>
          <h1 class="report-title">STS / Flagged Results</h1>
          <div class="report-meta">${esc(co.name)} · ${esc(co.province)} · ${from} to ${to}</div>
          <div class="report-meta">Generated ${genDate}</div>
        </div>
      </div>

      ${rows.length === 0
        ? '<p style="color:#555;margin-top:16px;font-size:14px">No flagged results (Early Warning / Abnormal) found for this period.</p>'
        : `
          <p style="font-size:13px;color:#555;margin-bottom:16px">
            ${rows.length} flagged result${rows.length !== 1 ? 's' : ''} requiring audiologist review or follow-up action.
          </p>
          <div class="report-sts-list">${cards}</div>
        `
      }

      <div class="report-footer">
        ${esc(co.name)} · Flagged Results ${from} to ${to}
      </div>
    </div>
  `
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAT_LABEL = { N: 'Normal', EW: 'Early Warning', A: 'Abnormal', NC: 'No Change', EWC: 'EW Change', AC: 'Abn Change' }
const CAT_CLASS = { N: 'n', EW: 'ew', A: 'a', NC: 'n', EWC: 'ew', AC: 'a' }

function parseCat(classJson) {
  if (!classJson) return null
  try { return JSON.parse(classJson)?.category ?? null } catch { return null }
}

function parseJson(val) {
  if (!val) return null
  try { return typeof val === 'string' ? JSON.parse(val) : val } catch { return null }
}

function catBadge(cat) {
  if (!cat) return '—'
  return `<span class="class-badge class-${CAT_CLASS[cat] ?? ''}">${CAT_LABEL[cat] ?? cat}</span>`
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Excel Export — Company Annual
// ---------------------------------------------------------------------------

function exportCompanyXlsx(companyId, year) {
  const XLSX = window.XLSX
  if (!XLSX) { alert('Excel library not loaded. Please refresh and try again.'); return }

  const co = queryOne('SELECT * FROM companies WHERE company_id = ?', [companyId])
  if (!co) return

  // --- Summary data (mirrors on-screen report stats) ---
  const summaryRows = query(`
    SELECT e.employee_id,
           t.test_id, t.classification
    FROM employees e
    LEFT JOIN tests t ON t.test_id = (
      SELECT test_id FROM tests
      WHERE employee_id = e.employee_id AND test_date LIKE ?
      ORDER BY test_date DESC LIMIT 1
    )
    WHERE e.company_id = ? AND e.status = 'active'
  `, [`${year}-%`, companyId])

  const tested = summaryRows.filter(r => r.test_id != null)
  const counts = { N: 0, NC: 0, EW: 0, EWC: 0, A: 0, AC: 0 }
  for (const r of tested) {
    const cat = parseCat(r.classification)
    if (cat in counts) counts[cat]++
  }

  const summarySheet = [
    [`${co.name} — Annual Hearing Test Report ${year}`],
    [],
    ['Company Name',   co.name],
    ['Province',       co.province],
    ['Report Year',    year],
    ['Contact',        co.contact_name  ?? ''],
    ['Phone',          co.contact_phone ?? ''],
    ['Email',          co.contact_email ?? ''],
    ['Generated',      new Date().toLocaleDateString('en-CA')],
    [],
    ['SUMMARY'],
    ['Active Employees', `Tested in ${year}`, 'Not Tested', 'Normal / No Change', 'Early Warning', 'Abnormal'],
    [
      summaryRows.length,
      tested.length,
      summaryRows.length - tested.length,
      counts.N + counts.NC,
      counts.EW + counts.EWC,
      counts.A + counts.AC
    ]
  ]

  // --- Detail data — all tests for selected year ---
  const detailRows = query(`
    SELECT e.last_name, e.first_name, e.dob, e.hire_date, e.job_title,
           t.test_date, t.test_type, t.province, t.classification, t.sts_flag,
           t.left_500,  t.left_1k,  t.left_2k,  t.left_3k,  t.left_4k,  t.left_6k,  t.left_8k,
           t.right_500, t.right_1k, t.right_2k, t.right_3k, t.right_4k, t.right_6k, t.right_8k,
           t.triggering_ear, t.triggering_freq_hz, t.shift_db,
           t.tech_id, t.counsel_text, t.tech_notes, t.packet_id,
           h.hpd_make_model, h.rated_nrr, h.derated_nrr, h.lex8hr, h.protected_exposure, h.adequacy
    FROM tests t
    JOIN employees e ON e.employee_id = t.employee_id
    LEFT JOIN hpd_assessments h ON h.test_id = t.test_id
    WHERE e.company_id = ? AND t.test_date LIKE ?
    ORDER BY e.last_name, e.first_name, t.test_date DESC
  `, [companyId, `${year}-%`])

  const DETAIL_HEADERS = [
    'Last Name', 'First Name', 'DOB', 'Hire Date', 'Job Title',
    'Test Date', 'Test Type', 'Province', 'Classification', 'STS Flag',
    'L-500', 'L-1k', 'L-2k', 'L-3k', 'L-4k', 'L-6k', 'L-8k',
    'R-500', 'R-1k', 'R-2k', 'R-3k', 'R-4k', 'R-6k', 'R-8k',
    'Triggering Ear', 'Triggering Freq (Hz)', 'Shift (dB)',
    'Tech ID', 'HPD Make/Model', 'Rated NRR', 'Derated NRR',
    'LEX8hr (dB)', 'Protected Exposure (dB)', 'HPD Adequacy',
    'Counselling', 'Tech Notes', 'Packet ID'
  ]

  const detailSheet = [
    DETAIL_HEADERS,
    ...detailRows.map(r => [
      r.last_name,   r.first_name,  r.dob ?? '',       r.hire_date ?? '', r.job_title ?? '',
      r.test_date,   r.test_type,   r.province,
      parseCat(r.classification) ?? '', r.sts_flag ? 'Yes' : 'No',
      r.left_500  ?? '', r.left_1k  ?? '', r.left_2k  ?? '', r.left_3k  ?? '',
      r.left_4k   ?? '', r.left_6k  ?? '', r.left_8k  ?? '',
      r.right_500 ?? '', r.right_1k ?? '', r.right_2k ?? '', r.right_3k ?? '',
      r.right_4k  ?? '', r.right_6k ?? '', r.right_8k ?? '',
      r.triggering_ear ?? '', r.triggering_freq_hz ?? '', r.shift_db ?? '',
      r.tech_id         ?? '', r.hpd_make_model ?? '', r.rated_nrr ?? '', r.derated_nrr ?? '',
      r.lex8hr          ?? '', r.protected_exposure ?? '', r.adequacy ?? '',
      r.counsel_text ?? '', r.tech_notes ?? '', r.packet_id ?? ''
    ])
  ]

  // Build workbook
  const wb  = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet(summarySheet)
  const ws2 = XLSX.utils.aoa_to_sheet(detailSheet)

  // Column widths for detail sheet
  ws2['!cols'] = DETAIL_HEADERS.map(h => {
    if (h === 'Counselling' || h === 'Tech Notes') return { wch: 50 }
    if (h.startsWith('L-') || h.startsWith('R-'))  return { wch: 7  }
    if (h === 'Last Name' || h === 'First Name')    return { wch: 18 }
    return { wch: 16 }
  })

  XLSX.utils.book_append_sheet(wb, ws1, 'Summary')
  XLSX.utils.book_append_sheet(wb, ws2, 'Test Detail')

  const safeName = co.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
  const filename  = `${safeName}_${year}_HearingTestReport.xlsx`

  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob  = new Blob([wbout], { type: 'application/octet-stream' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
