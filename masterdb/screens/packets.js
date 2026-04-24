import { getAllPackets } from '../db/packets.js'

export function renderPackets(container, state, navigate) {
  const all       = getAllPackets()
  const pending   = all.filter(p => p.status === 'pending')
  const submitted = all.filter(p => p.status === 'submitted')
  const rejected  = all.filter(p => p.status === 'rejected')
  const recent    = all.filter(p => p.status === 'imported' || p.status === 'archived').slice(0, 15)

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>Packets</h1>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" id="btn-rejected">View Rejected</button>
          <button class="btn btn-outline btn-sm" id="btn-check-inbox">↙ Check Inbox</button>
          <button class="btn btn-primary"        id="btn-new-packet">+ New Packet</button>
        </div>
      </div>

      <!-- In the field -->
      <div class="packets-group">
        <div class="packets-group-head">
          <h2>In the Field <span class="packets-count">${pending.length}</span></h2>
          <span class="section-desc-inline">Generated and waiting for tech to complete.</span>
        </div>
        ${pending.length === 0
          ? '<p class="empty-note">No packets currently in the field.</p>'
          : packetTable(pending, false)
        }
      </div>

      <!-- Ready to import -->
      ${submitted.length > 0 ? `
        <div class="packets-group">
          <div class="packets-group-head">
            <h2>Ready to Import <span class="packets-count packets-count--alert">${submitted.length}</span></h2>
            <span class="section-desc-inline">Completed by tech — awaiting review and import.</span>
          </div>
          ${packetTable(submitted, true)}
        </div>
      ` : ''}

      <!-- Recent -->
      ${recent.length > 0 ? `
        <div class="packets-group">
          <div class="packets-group-head">
            <h2>Recently Completed <span class="packets-count packets-count--muted">${recent.length}</span></h2>
          </div>
          ${packetTable(recent, false)}
        </div>
      ` : ''}

      ${all.length === 0 ? `
        <div class="empty-state">
          <p>No packets on file.</p>
          <p>Open any company and use <strong>Generate Packet</strong> to create one for a field visit.</p>
        </div>
      ` : ''}
    </div>
  `

  container.querySelector('#btn-rejected').addEventListener('click', () =>
    navigate('rejected-packets')
  )
  container.querySelector('#btn-new-packet').addEventListener('click', () =>
    navigate('generate-packet')
  )
  container.querySelector('#btn-check-inbox').addEventListener('click', () =>
    navigate('incoming')
  )
  container.querySelectorAll('.btn-review').forEach(btn => {
    btn.addEventListener('click', () =>
      navigate('import-confirm', { params: { packetId: btn.dataset.packetId } })
    )
  })
}

function packetTable(packets, showReview) {
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Company</th><th>Province</th><th>Visit Date</th>
          <th>Tech</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${packets.map(p => `
          <tr>
            <td class="td-primary">${esc(p.company_name)}</td>
            <td><span class="province-badge">${esc(p.province)}</span></td>
            <td>${p.visit_date ?? '—'}</td>
            <td>${esc(p.tech_id ?? '—')}</td>
            <td><span class="packet-status packet-status--${p.status}">${statusLabel(p.status)}</span></td>
            <td>
              ${showReview
                ? `<button class="btn btn-primary btn-sm btn-review" data-packet-id="${esc(p.packet_id)}">Review &amp; Import →</button>`
                : ''
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function statusLabel(s) {
  return {
    pending:  'In Field',
    submitted:'Ready to Import',
    imported: 'Imported',
    archived: 'Archived',
    rejected: 'Rejected'
  }[s] ?? s
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
