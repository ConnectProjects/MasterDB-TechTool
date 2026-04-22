import { searchEmployees } from '../db/employees.js'
import { query }           from '../db/sqlite.js'

export function renderEmployees(container, state, navigate) {
  const filter = state.params?.filter ?? ''

  const ALL_EMPLOYEES_SQL = `
    SELECT e.*, c.name AS company_name, c.province,
      (SELECT t.classification FROM tests t WHERE t.employee_id = e.employee_id ORDER BY t.test_date DESC LIMIT 1) AS last_classification,
      (SELECT t.test_date FROM tests t WHERE t.employee_id = e.employee_id ORDER BY t.test_date DESC LIMIT 1) AS last_test_date
    FROM employees e
    JOIN companies c ON c.company_id = e.company_id
    WHERE e.status = 'active' AND c.active = 1
    ORDER BY e.last_name, e.first_name
  `

  let currentFilter = filter
  let currentSearch = ''

  function getDisplayed() {
    const base = currentSearch.length >= 2
      ? searchEmployees(currentSearch)
      : query(ALL_EMPLOYEES_SQL)
    if (!currentFilter) return base
    return base.filter(e => {
      const cat = parseClassification(e.last_classification)?.category
      // EW filter matches EW and EWC; A filter matches A and AC; N matches N and NC
      if (currentFilter === 'EW') return cat === 'EW' || cat === 'EWC'
      if (currentFilter === 'A')  return cat === 'A'  || cat === 'AC'
      if (currentFilter === 'N')  return cat === 'N'  || cat === 'NC'
      return cat === currentFilter
    })
  }

  function refresh() {
    const displayed = getDisplayed()
    const tbody = container.querySelector('#emp-tbody')
    if (tbody) tbody.innerHTML = renderRows(displayed)
    const count = container.querySelector('#result-count')
    if (count) count.textContent = `${displayed.length} employee${displayed.length !== 1 ? 's' : ''}`
    attachRowHandlers(container, navigate)
  }

  const initialDisplayed = getDisplayed()

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>Employees</h1>
        <div class="header-actions">
          <select id="filter-cat" class="select-sm">
            <option value="">All classifications</option>
            <option value="A"   ${currentFilter === 'A'   ? 'selected' : ''}>Abnormal / AC</option>
            <option value="EW"  ${currentFilter === 'EW'  ? 'selected' : ''}>Early Warning</option>
            <option value="N"   ${currentFilter === 'N'   ? 'selected' : ''}>Normal / NC</option>
          </select>
        </div>
      </div>

      <div class="toolbar">
        <input id="emp-search" type="search" class="search-input" placeholder="Search by name or company…" />
        <span class="result-count" id="result-count">${initialDisplayed.length} employee${initialDisplayed.length !== 1 ? 's' : ''}</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Company</th><th>Province</th>
            <th>Last Test</th><th>Classification</th>
          </tr>
        </thead>
        <tbody id="emp-tbody">
          ${renderRows(initialDisplayed)}
        </tbody>
      </table>
    </div>
  `

  container.querySelector('#filter-cat').addEventListener('change', e => {
    currentFilter = e.target.value
    refresh()
  })

  container.querySelector('#emp-search').addEventListener('input', e => {
    currentSearch = e.target.value.trim()
    refresh()
  })

  attachRowHandlers(container, navigate)
}

function renderRows(employees) {
  if (employees.length === 0) {
    return '<tr><td colspan="5" class="empty-cell">No employees found.</td></tr>'
  }
  return employees.map(e => {
    const cls = parseClassification(e.last_classification)?.category
    return `
      <tr class="table-row" data-company-id="${e.company_id}">
        <td class="td-primary">${esc(e.last_name)}, ${esc(e.first_name)}</td>
        <td>${esc(e.company_name)}</td>
        <td><span class="province-badge">${esc(e.province)}</span></td>
        <td>${e.last_test_date ?? '—'}</td>
        <td>${cls ? classBadge(cls) : '—'}</td>
      </tr>
    `
  }).join('')
}

function attachRowHandlers(container, navigate) {
  container.querySelectorAll('.table-row[data-company-id]').forEach(row => {
    row.addEventListener('click', () =>
      navigate('company-detail', { currentCompany: { company_id: Number(row.dataset.companyId) } })
    )
  })
}

function classBadge(cat) {
  const m = { N: 'n', EW: 'ew', A: 'a', NC: 'nc', EWC: 'ewc', AC: 'ac' }
  const l = { N: 'Normal', EW: 'Early Warning', A: 'Abnormal', NC: 'No Change', EWC: 'EW Change', AC: 'Abn Change' }
  return `<span class="class-badge class-${m[cat] ?? ''}">${l[cat] ?? cat}</span>`
}

function parseClassification(val) {
  if (!val) return null
  try { return typeof val === 'string' ? JSON.parse(val) : val } catch { return null }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
