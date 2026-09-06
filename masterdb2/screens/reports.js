/**
 * masterdb2/screens/reports.js — billing / activity report
 *
 * Groups tests by company → location → visit date.
 * Generates a summary table and a downloadable CSV.
 */

import { query } from '../db/db.js'
import { generateWsbcCsv, validateWsbcExport } from '../db/wsbc-export.js'

export function mount(container) {
  const today       = new Date()
  const defaultFrom = `${today.getFullYear()}-01-01`
  const defaultTo   = today.toISOString().slice(0, 10)

  let companies = []
  let allLocations = []
  try {
    companies    = query(`SELECT company_id, name FROM companies WHERE active = 1 ORDER BY name`)
    allLocations = query(`SELECT l.location_id, l.name, l.company_id FROM locations l JOIN companies c ON c.company_id = l.company_id WHERE c.active = 1 ORDER BY l.name`)
  } catch { /* non-fatal */ }

  const coOpts = companies.map(c =>
    `<option value="${c.company_id}">${esc(c.name)}</option>`
  ).join('')

  container.innerHTML = `
    <div class="screen-header-row">
      <h1>Reports</h1>
    </div>
    <div class="screen-body">

      <div class="info-card" style="margin-bottom:1.5rem">
        <div style="display:flex;align-items:flex-end;gap:1rem;flex-wrap:wrap">
          <div>
            <label style="font-size:0.8rem;color:var(--clr-subtle);display:block;margin-bottom:0.25rem">From</label>
            <input type="date" class="form-select" id="r-from" value="${defaultFrom}">
          </div>
          <div>
            <label style="font-size:0.8rem;color:var(--clr-subtle);display:block;margin-bottom:0.25rem">To</label>
            <input type="date" class="form-select" id="r-to" value="${defaultTo}">
          </div>
          <div>
            <label style="font-size:0.8rem;color:var(--clr-subtle);display:block;margin-bottom:0.25rem">Company</label>
            <select class="form-select" id="r-company" style="min-width:200px">
              <option value="">All companies</option>
              ${coOpts}
            </select>
          </div>
          <div id="r-locations-wrap" style="display:none">
            <label style="font-size:0.8rem;color:var(--clr-subtle);display:block;margin-bottom:0.25rem">Locations <span style="font-weight:400">(none = all)</span></label>
            <select class="form-select" id="r-locations" multiple style="min-width:220px;height:7rem"></select>
          </div>
          <button class="btn btn-primary" id="r-generate" style="align-self:flex-end">Generate</button>
        </div>
      </div>

      <div id="r-output"></div>
    </div>
  `

  const companyEl      = container.querySelector('#r-company')
  const locationsEl    = container.querySelector('#r-locations')
  const locationsWrap  = container.querySelector('#r-locations-wrap')

  function populateLocations(companyId) {
    if (!companyId) {
      locationsWrap.style.display = 'none'
      locationsEl.innerHTML = ''
      return
    }
    const filtered = allLocations.filter(l => l.company_id === Number(companyId))
    locationsEl.innerHTML = filtered.map(l =>
      `<option value="${l.location_id}">${esc(l.name)}</option>`
    ).join('')
    locationsWrap.style.display = ''
  }

  populateLocations('')

  companyEl.addEventListener('change', () => {
    populateLocations(companyEl.value)
  })

  container.querySelector('#r-generate').addEventListener('click', generateReport)

  function getSelectedLocationIds() {
    return Array.from(locationsEl.selectedOptions).map(o => Number(o.value))
  }

  function locationClause(locationIds) {
    if (!locationIds.length) return ''
    return `AND l.location_id IN (${locationIds.map(() => '?').join(',')})`
  }

  function generateReport() {
    const from        = container.querySelector('#r-from').value
    const to          = container.querySelector('#r-to').value
    const companyId   = companyEl.value
    const locationIds = getSelectedLocationIds()
    const output      = container.querySelector('#r-output')

    if (!from || !to) {
      output.innerHTML = `<div class="warning-banner">Please set both a From and To date.</div>`
      return
    }
    if (from > to) {
      output.innerHTML = `<div class="warning-banner">From date must be before To date.</div>`
      return
    }

    let workerRows
    try {
      const sql = `
        SELECT
          c.company_id,  c.name AS company_name,
          l.location_id, l.name AS location_name, l.province,
          DATE(te.test_date) AS visit_date,
          e.last_name, e.first_name,
          te.classification
        FROM tests te
        JOIN  employees e  ON e.employee_id = te.employee_id
        JOIN  locations l  ON l.location_id = te.location_id
        JOIN  companies c  ON c.company_id  = l.company_id
        WHERE te.deleted_at IS NULL
          AND te.test_date >= ?
          AND te.test_date <= ?
          ${companyId ? 'AND c.company_id = ?' : ''}
          ${locationClause(locationIds)}
        ORDER BY c.name, te.test_date DESC, l.name, e.last_name, e.first_name`

      const params = [from, to,
        ...(companyId   ? [Number(companyId)] : []),
        ...locationIds
      ]
      workerRows = query(sql, params)
    } catch (e) {
      output.innerHTML = `<div class="error-banner"><strong>Query error:</strong> ${esc(e.message)}</div>`
      return
    }

    if (!workerRows.length) {
      output.innerHTML = `<div class="table-card"><div class="table-empty">No tests found in that date range.</div></div>`
      return
    }

    // Build province → code → label map so we show "Normal" not "N"
    // Fallback covers 'N' which is a hardcoded engine return (no DB row in SK)
    const CODE_FALLBACKS = { N: 'Normal', EW: 'Early Warning', A: 'Abnormal',
                             NC: 'Normal', EWC: 'Early Warning Concern', AC: 'Audiometric Concern' }
    let labelMap = {}
    try {
      const ruleRows = query('SELECT province_code, category_code, MIN(category_label) AS category_label FROM classification_rules GROUP BY province_code, category_code')
      for (const r of ruleRows) {
        if (!labelMap[r.province_code]) labelMap[r.province_code] = {}
        labelMap[r.province_code][r.category_code] = r.category_label
      }
    } catch { /* non-fatal */ }

    function categoryLabel(province, code) {
      if (!code) return ''
      return (labelMap[province] ?? {})[code] ?? CODE_FALLBACKS[code] ?? code
    }

    // Group by company → location → visit date
    const visits = []
    const visitIndex = {}
    for (const row of workerRows) {
      const key = `${row.company_id}|${row.location_id}|${row.visit_date}`
      if (!visitIndex[key]) {
        const visit = {
          company_name:  row.company_name,
          location_name: row.location_name,
          province:      row.province,
          visit_date:    row.visit_date,
          workers:       [],
        }
        visitIndex[key] = visit
        visits.push(visit)
      }
      visitIndex[key].workers.push({
        name:     `${row.last_name}, ${row.first_name}`,
        category: categoryLabel(row.province, row.classification),
      })
    }

    const totalWorkers = workerRows.length
    const totalVisits  = visits.length

    // Check if any BC location is present (for WSBC export button)
    const hasBcLocation = visits.some(v => v.province === 'BC')

    const blocksHTML = visits.map(v => {
      const workerRowsHTML = v.workers.map(w => `
        <tr><td>${esc(w.name)}</td><td>${esc(w.category)}</td></tr>
      `).join('')

      return `
        <div class="info-card" style="margin-bottom:1rem;padding:0">
          <div style="display:flex;align-items:baseline;justify-content:space-between;
                      padding:0.6rem 1rem;border-bottom:1px solid var(--clr-border);
                      background:var(--clr-surface-alt, #f8f9fa);border-radius:var(--radius) var(--radius) 0 0">
            <div>
              <strong style="font-size:0.95rem">${esc(v.company_name)}</strong>
              <span style="color:var(--clr-subtle);margin:0 0.4rem">·</span>
              <span style="font-size:0.875rem">${esc(v.location_name)}${v.province ? `, ${esc(v.province)}` : ''}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--clr-subtle);white-space:nowrap;margin-left:1rem">
              <strong>Test Date:</strong> ${fmtDate(v.visit_date)}
              &nbsp;·&nbsp;
              <strong>${v.workers.length}</strong> worker${v.workers.length !== 1 ? 's' : ''} tested
            </div>
          </div>
          <div class="table-wrap" style="padding:0">
            <table class="data-table" style="margin:0">
              <thead>
                <tr><th>Worker</th><th>Category</th></tr>
              </thead>
              <tbody>${workerRowsHTML}</tbody>
            </table>
          </div>
        </div>
      `
    }).join('')

    output.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
        <p style="font-size:0.875rem;color:var(--clr-subtle)">
          ${totalVisits} visit${totalVisits !== 1 ? 's' : ''}
          &nbsp;&mdash;&nbsp;
          <strong>${totalWorkers}</strong> worker${totalWorkers !== 1 ? 's' : ''} tested
        </p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-secondary" id="r-csv">Export to Excel</button>
          ${hasBcLocation ? `<button class="btn btn-secondary" id="r-wsbc-csv" title="Generate WorkSafeBC File_Upload_Template CSV">Export for WSBC</button>` : ''}
        </div>
      </div>
      <div id="r-wsbc-validation"></div>
      ${blocksHTML}
    `

    output.querySelector('#r-csv').addEventListener('click', () => {
      let workerRows = []
      try {
        const sql2 = `
          SELECT
            c.name AS company_name,
            l.name AS location_name, l.province,
            DATE(te.test_date) AS visit_date,
            tk.name            AS tech_name,
            e.last_name, e.first_name, e.middle_name, e.dob,
            te.test_type, te.classification,
            te.referral_given_to_worker, te.sts_flag
          FROM tests te
          JOIN  employees e  ON e.employee_id  = te.employee_id
          JOIN  locations l  ON l.location_id  = te.location_id
          JOIN  companies c  ON c.company_id   = l.company_id
          LEFT JOIN techs tk ON tk.tech_id     = te.tech_id
          WHERE te.deleted_at IS NULL
            AND te.test_date >= ?
            AND te.test_date <= ?
            ${companyId ? 'AND c.company_id = ?' : ''}
            ${locationClause(locationIds)}
          ORDER BY c.name, te.test_date DESC, l.name, e.last_name, e.first_name`
        const params2 = [from, to,
          ...(companyId   ? [Number(companyId)] : []),
          ...locationIds
        ]
        workerRows = query(sql2, params2)
      } catch { /* fall back to summary only */ }

      const headers = [
        'Company','Location','Province','Visit Date','Tech',
        'Last Name','First Name','Middle','DOB',
        'Test Type','Classification','Referral','STS'
      ]
      const csvData = [
        headers,
        ...workerRows.map(r => [
          r.company_name, r.location_name, r.province ?? '', r.visit_date, r.tech_name ?? '',
          r.last_name, r.first_name, r.middle_name ?? '', r.dob ?? '',
          r.test_type ?? '', r.classification ?? '',
          r.referral_given_to_worker ? 'Yes' : '',
          r.sts_flag ? 'Yes' : '',
        ])
      ]
      downloadCSV(`connect-hearing-report-${from}-to-${to}.csv`, csvData)
    })

    if (hasBcLocation) {
      output.querySelector('#r-wsbc-csv')?.addEventListener('click', () => {
        const validEl = output.querySelector('#r-wsbc-validation')
        validEl.innerHTML = ''

        try {
          const sql3 = `
            SELECT te.test_id FROM tests te
            JOIN  locations l ON l.location_id = te.location_id
            JOIN  companies c ON c.company_id  = l.company_id
            WHERE te.deleted_at IS NULL AND l.province = 'BC'
              AND te.test_date >= ? AND te.test_date <= ?
              ${companyId ? 'AND c.company_id = ?' : ''}
              ${locationClause(locationIds)}
            ORDER BY te.test_date`
          const p3 = [from, to,
            ...(companyId ? [Number(companyId)] : []),
            ...locationIds
          ]
          const ids = query(sql3, p3).map(r => r.test_id)
          if (!ids.length) {
            validEl.innerHTML = `<div class="warning-banner" style="margin-bottom:1rem">No BC tests in the selected date range and location filter.</div>`
            return
          }

          const { valid, groups, totalCount } = validateWsbcExport(ids)
          if (!valid) {
            validEl.innerHTML = renderWsbcValidationErrors(groups, totalCount)
            validEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            return
          }

          const { csv, filename } = generateWsbcCsv(ids)
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url  = URL.createObjectURL(blob)
          const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } catch (e) {
          output.querySelector('#r-wsbc-validation').innerHTML =
            `<div class="error-banner" style="margin-bottom:1rem"><strong>Export failed:</strong> ${esc(e.message)}</div>`
        }
      })
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function downloadCSV(filename, rows) {
  const csv  = rows.map(r => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvCell(v) {
  const s = String(v ?? '')
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function fmtDate(d) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-CA') } catch { return d }
}

function renderWsbcValidationErrors(groups, totalCount) {
  const sectionStyle = 'margin-bottom:0.9rem'
  const labelStyle   = 'font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#8b1a1a;margin:0 0 0.3rem'
  const listStyle    = 'margin:0;padding-left:1.25rem;font-size:0.85rem;line-height:1.6'

  const sections = []

  if (groups.company.length) {
    sections.push(`
      <div style="${sectionStyle}">
        <p style="${labelStyle}">Company setup (${groups.company.length})</p>
        <ul style="${listStyle}">${groups.company.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
      </div>`)
  }

  if (groups.location.length) {
    sections.push(`
      <div style="${sectionStyle}">
        <p style="${labelStyle}">Location setup (${groups.location.length})</p>
        <ul style="${listStyle}">${groups.location.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
      </div>`)
  }

  if (groups.worker.length) {
    const totalFields = groups.worker.reduce((n, w) => n + w.fields.length, 0)
    sections.push(`
      <div style="${sectionStyle}">
        <p style="${labelStyle}">Worker records — ${totalFields} missing field${totalFields !== 1 ? 's' : ''} across ${groups.worker.length} worker${groups.worker.length !== 1 ? 's' : ''}</p>
        <ul style="${listStyle}">${groups.worker.map(w =>
          `<li><strong>${esc(w.name)}</strong> — missing: ${w.fields.map(esc).join(', ')}</li>`
        ).join('')}</ul>
      </div>`)
  }

  if (groups.test.length) {
    sections.push(`
      <div style="${sectionStyle}">
        <p style="${labelStyle}">Questionnaire / test data (${groups.test.length} issue${groups.test.length !== 1 ? 's' : ''})</p>
        <ul style="${listStyle}">${groups.test.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
      </div>`)
  }

  return `
    <div style="margin-bottom:1.25rem;padding:1rem 1.25rem;border-radius:var(--radius);
                border-left:4px solid #c0392b;background:#fff8f7;
                border:1px solid #f5c6c6;border-left:4px solid #c0392b">
      <p style="font-weight:700;color:#c0392b;margin:0 0 0.75rem;font-size:0.95rem">
        Export blocked &mdash; ${totalCount} issue${totalCount !== 1 ? 's' : ''} must be corrected before generating the WSBC file
      </p>
      ${sections.join('')}
      <p style="font-size:0.8rem;color:var(--clr-subtle);margin:0.5rem 0 0">
        Correct the above in company, location, or worker settings, then click <strong>Export for WSBC</strong> again.
      </p>
    </div>`
}

