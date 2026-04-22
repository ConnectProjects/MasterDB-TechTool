import { getCompany }           from '../db/companies.js'
import { buildPacketEmployees } from '../db/employees.js'
import { getTechs, createPacketRecord } from '../db/packets.js'
import { query }                from '../db/sqlite.js'
import { createPacket }         from '@shared/packet/schema.js'
import { getSyncFolder, pickSyncFolder, writeJsonFile } from '@shared/fs/sync-folder.js'

export function renderGeneratePacket(container, state, navigate) {
  const company = state.currentCompany?.company_id
    ? getCompany(state.currentCompany.company_id)
    : null

  const techs = getTechs()
  const today = new Date().toISOString().slice(0, 10)

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <div class="breadcrumb">
          <button class="btn btn-link" id="btn-back">
            ${company ? esc(company.name) : 'Companies'}
          </button>
          <span>›</span>
          <span>Generate Packet</span>
        </div>
      </div>

      <div class="form-card">
        <h2>Packet Details</h2>

        <div class="form-grid">
          <div class="form-group span-2">
            <label>Company</label>
            ${company
              ? `<div class="read-only-field">${esc(company.name)} (${esc(company.province)})</div>`
              : `<select id="f-company">
                  <option value="">— select company —</option>
                  ${getCompaniesOptions()}
                </select>`
            }
          </div>
          <div class="form-group">
            <label>Visit Date *</label>
            <input id="f-visit-date" type="date" value="${today}" />
          </div>
          <div class="form-group">
            <label>Assigned Tech *</label>
            <select id="f-tech">
              <option value="">— select tech —</option>
              ${techs.map(t =>
                `<option value="${esc(t.tech_id)}"
                  data-initials="${esc(t.initials)}"
                  data-folder="${esc(t.folder_name ?? '')}"
                  >${esc(t.name)}${t.folder_name ? '' : ' ⚠ no folder'}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div id="preview-section" class="hidden">
          <h3>Packet Preview</h3>
          <div id="preview-content"></div>
        </div>

        <div id="packet-error"   class="alert alert-error   hidden"></div>
        <div id="packet-success" class="alert alert-success hidden"></div>

        <div class="action-row">
          <button class="btn btn-outline" id="btn-preview">Preview Packet</button>
          <button class="btn btn-primary" id="btn-generate">Generate &amp; Save to Sync Folder</button>
        </div>
      </div>
    </div>
  `

  container.querySelector('#btn-back').addEventListener('click', () =>
    company
      ? navigate('company-detail', { currentCompany: company })
      : navigate('companies')
  )

  container.querySelector('#btn-preview').addEventListener('click', () =>
    doPreview(container, company, state)
  )

  container.querySelector('#btn-generate').addEventListener('click', () =>
    doGenerate(container, company, state, navigate)
  )
}

function getCompaniesOptions() {
  const companies = query('SELECT company_id, name, province FROM companies WHERE active = 1 ORDER BY name')
  return companies.map(c =>
    `<option value="${c.company_id}">${esc(c.name)} (${esc(c.province)})</option>`
  ).join('')
}

function getFormValues(container, company) {
  const companyId  = company?.company_id ?? Number(container.querySelector('#f-company')?.value)
  const visitDate  = container.querySelector('#f-visit-date').value
  const techSelect = container.querySelector('#f-tech')
  const techId     = techSelect?.value
  const techInit   = techSelect?.selectedOptions?.[0]?.dataset?.initials ?? techId?.slice(0, 2).toUpperCase()
  const techFolder = techSelect?.selectedOptions?.[0]?.dataset?.folder ?? ''
  return { companyId, visitDate, techId, techInit, techFolder }
}

function doPreview(container, company, state) {
  const { companyId, visitDate, techId } = getFormValues(container, company)
  const errEl = container.querySelector('#packet-error')

  if (!companyId) { errEl.textContent = 'Select a company.';    errEl.classList.remove('hidden'); return }
  if (!visitDate) { errEl.textContent = 'Select a visit date.'; errEl.classList.remove('hidden'); return }
  errEl.classList.add('hidden')

  const co        = getCompany(companyId)
  const employees = buildPacketEmployees(companyId)

  container.querySelector('#preview-content').innerHTML = `
    <div class="preview-card">
      <div class="preview-row"><span>Company</span><strong>${esc(co.name)}</strong></div>
      <div class="preview-row"><span>Province</span><strong>${esc(co.province)}</strong></div>
      <div class="preview-row"><span>Visit Date</span><strong>${visitDate}</strong></div>
      <div class="preview-row"><span>Employees in packet</span><strong>${employees.length}</strong></div>
      <div class="preview-row"><span>Employees with baseline</span><strong>${employees.filter(e => e.baseline).length}</strong></div>
      <div class="preview-row"><span>Tech</span><strong>${techId ? esc(techId) : '— not selected —'}</strong></div>
    </div>
    <div class="preview-emp-list">
      ${employees.slice(0, 10).map(e =>
        `<div class="preview-emp-row">
          <span>${esc(e.last_name)}, ${esc(e.first_name)}</span>
          <span class="td-muted">${e.baseline ? 'Baseline on file' : 'No baseline'}</span>
        </div>`
      ).join('')}
      ${employees.length > 10 ? `<div class="preview-emp-more">+ ${employees.length - 10} more</div>` : ''}
    </div>
  `
  container.querySelector('#preview-section').classList.remove('hidden')
}

async function doGenerate(container, company, state, navigate) {
  const { companyId, visitDate, techId, techInit, techFolder } = getFormValues(container, company)
  const errEl = container.querySelector('#packet-error')
  const sucEl = container.querySelector('#packet-success')
  const btn   = container.querySelector('#btn-generate')

  errEl.classList.add('hidden')
  sucEl.classList.add('hidden')

  if (!companyId)  { errEl.textContent = 'Select a company.';                                  errEl.classList.remove('hidden'); return }
  if (!visitDate)  { errEl.textContent = 'Visit date required.';                                errEl.classList.remove('hidden'); return }
  if (!techId)     { errEl.textContent = 'Select a tech.';                                      errEl.classList.remove('hidden'); return }
  if (!techFolder) { errEl.textContent = 'Selected tech has no folder name. Set it in Settings → Technicians.'; errEl.classList.remove('hidden'); return }

  btn.disabled    = true
  btn.textContent = 'Generating…'

  try {
    // Ensure sync folder access
    let folder = state.syncFolder
    if (!folder) {
      btn.textContent = 'Select sync folder…'
      folder = await getSyncFolder()
      if (!folder) folder = await pickSyncFolder()
      state.syncFolder = folder
    }

    btn.textContent = 'Saving packet…'

    const co        = getCompany(companyId)
    const employees = buildPacketEmployees(companyId)
    const rules     = query('SELECT * FROM classification_rules WHERE province_code = ? ORDER BY priority DESC', [co.province])
    const counsel   = query('SELECT * FROM counsel_templates WHERE province_code = ?', [co.province])
    const hpdInv    = JSON.parse(co.hpd_inventory ?? '[]')

    const packet = createPacket({
      company:          co,
      employees,
      rules,
      counselTemplates: counsel,
      hpdInventory:     hpdInv,
      techId,
      techInitials:     techInit ?? 'XX',
      visitDate,
      stickyNotes:      co.sticky_notes ?? ''
    })

    const techSubfolder = `techs/${techFolder}`
    await writeJsonFile(folder, techSubfolder, packet.filename, packet)
    createPacketRecord(packet.packet_id, companyId, techId, visitDate, packet.filename)

    sucEl.textContent = `✓ Packet "${packet.filename}" saved to ConnectHearing/techs/${techFolder}.`
    sucEl.classList.remove('hidden')
    btn.textContent = '✓ Generated'
  } catch (e) {
    if (e.name !== 'AbortError') {
      errEl.textContent = `Failed: ${e.message}`
      errEl.classList.remove('hidden')
    }
    btn.disabled    = false
    btn.textContent = 'Generate & Save to Sync Folder'
  }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
