import { getDashboardStats, getOverdueTests } from '../db/tests.js'
import { getPacketsByStatus }                 from '../db/packets.js'
import { isDemoLoaded, loadDemoData }         from '../db/demo.js'
import { query }                              from '../db/sqlite.js'

export function renderDashboard(container, state, navigate) {
  const stats          = getDashboardStats()
  const overdue        = getOverdueTests(24).slice(0, 8)
  const incoming       = getPacketsByStatus('submitted').slice(0, 5)
  const isEmpty        = stats.totalCompanies === 0 && !isDemoLoaded()

  // Pending referrals — tests with A/AC/EW classification not yet marked sent to employer
  const pendingReferrals = query(`
    SELECT t.test_id, t.test_date, t.test_type, t.classification,
           e.first_name, e.last_name, e.employee_id,
           c.name AS company_name, c.company_id,
           t.referral_given_to_worker
    FROM tests t
    JOIN employees e ON e.employee_id = t.employee_id
    JOIN companies c ON c.company_id  = e.company_id
    WHERE t.sts_flag = 1
      AND (t.referral_sent_to_employer IS NULL OR t.referral_sent_to_employer = 0)
      AND c.active = 1
    ORDER BY t.test_date DESC
    LIMIT 10
  `).filter(t => {
    try {
      const cls = typeof t.classification === 'string' ? JSON.parse(t.classification) : t.classification
      return cls && ['A','AC','EW'].includes(cls.category)
    } catch { return false }
  })

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>Dashboard</h1>
        <span class="page-date">${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      ${isEmpty ? `
        <div class="demo-banner">
          <span>👋 No data yet.</span>
          <button class="btn btn-sm btn-outline" id="btn-load-demo">Load Demo Data</button>
          <span class="demo-hint">Adds 2 sample companies, 7 employees, and test history so you can explore every screen.</span>
        </div>
      ` : isDemoLoaded() ? `
        <div class="demo-banner demo-banner--active">
          <span>📋 Demo data is loaded.</span>
          <span class="demo-hint">Remove it any time in Settings → Clear Demo Data.</span>
        </div>
      ` : ''}

      <!-- KPI tiles -->
      <div class="kpi-row">
        <div class="kpi-tile" data-action="companies">
          <div class="kpi-num">${stats.totalCompanies}</div>
          <div class="kpi-lbl">Companies</div>
        </div>
        <div class="kpi-tile" data-action="employees">
          <div class="kpi-num">${stats.totalEmployees}</div>
          <div class="kpi-lbl">Active Employees</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-num">${stats.testsThisMonth}</div>
          <div class="kpi-lbl">Tests (30 days)</div>
        </div>
        <div class="kpi-tile kpi-tile--warn ${stats.stsFlags > 0 ? '' : 'kpi-tile--ok'}">
          <div class="kpi-num">${stats.stsFlags}</div>
          <div class="kpi-lbl">STS Flags</div>
        </div>
        <div class="kpi-tile kpi-tile--blue ${stats.incomingPackets > 0 ? 'kpi-tile--alert' : ''}" data-action="incoming">
          <div class="kpi-num">${stats.incomingPackets}</div>
          <div class="kpi-lbl">Incoming Packets</div>
        </div>
        <div class="kpi-tile">
          <div class="kpi-num">${stats.pendingPackets}</div>
          <div class="kpi-lbl">Pending (in field)</div>
        </div>
      </div>

      <div class="dash-columns">
        <!-- Incoming packets -->
        <div class="dash-panel">
          <div class="panel-head">
            <h2>Incoming Completed Packets</h2>
            <button class="btn btn-sm btn-outline" id="btn-check-incoming">Check Sync Folder</button>
          </div>
          ${incoming.length === 0
            ? '<p class="empty-note">No packets awaiting import.</p>'
            : `<div class="incoming-list">
                ${incoming.map(p => `
                  <div class="incoming-row" data-packet-id="${p.packet_id}">
                    <div class="incoming-info">
                      <div class="incoming-company">${esc(p.company_name)}</div>
                      <div class="incoming-meta">${esc(p.province)} · ${p.visit_date}</div>
                    </div>
                    <button class="btn btn-sm btn-primary" data-packet-id="${p.packet_id}">Review →</button>
                  </div>
                `).join('')}
              </div>
              <button class="btn btn-link" id="btn-view-all-incoming">View all incoming →</button>`
          }
        </div>

        <!-- Overdue tests -->
        <div class="dash-panel">
          <div class="panel-head">
            <h2>Overdue Tests <span class="panel-head-hint">(> 24 months)</span></h2>
          </div>
          ${overdue.length === 0
            ? '<p class="empty-note">No overdue tests.</p>'
            : `<div class="overdue-list">
                ${overdue.map(e => `
                  <div class="overdue-row">
                    <div class="overdue-info">
                      <div class="overdue-name">${esc(e.last_name)}, ${esc(e.first_name)}</div>
                      <div class="overdue-meta">${esc(e.company_name)} · ${e.last_test_date ? 'Last: ' + e.last_test_date : 'Never tested'}</div>
                    </div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>
      </div>

      <!-- Pending referrals -->
      ${pendingReferrals.length > 0 ? `
        <div class="dash-panel dash-panel--referrals" style="margin-top:20px">
          <div class="panel-head">
            <h2>⚠ Pending Referrals <span class="panel-head-hint">(not yet sent to employer)</span></h2>
          </div>
          <div class="referral-list">
            ${pendingReferrals.map(t => {
              let cls = null
              try { cls = typeof t.classification === 'string' ? JSON.parse(t.classification) : t.classification } catch {}
              const cat = cls?.category ?? '?'
              return `
                <div class="referral-row">
                  <div class="referral-info">
                    <span class="class-badge class-${cat.toLowerCase()}">${esc(cat)}</span>
                    <div class="referral-name">${esc(t.last_name)}, ${esc(t.first_name)}</div>
                    <div class="referral-meta">${esc(t.company_name)} · ${esc(t.test_date)}</div>
                    ${t.referral_given_to_worker
                      ? '<span class="ref-status ref-done">✓ Given to worker</span>'
                      : '<span class="ref-status ref-pending">○ Not confirmed given to worker</span>'}
                  </div>
                  <button class="btn btn-sm btn-ghost btn-view-referral"
                    data-emp-id="${t.employee_id}">
                    View →
                  </button>
                </div>
              `
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `

  // KPI tile navigation
  container.querySelectorAll('.kpi-tile[data-action]').forEach(tile => {
    tile.style.cursor = 'pointer'
    tile.addEventListener('click', () => navigate(tile.dataset.action))
  })

  container.querySelector('#btn-check-incoming')?.addEventListener('click', () => navigate('incoming'))
  container.querySelector('#btn-load-demo')?.addEventListener('click', () => {
    loadDemoData()
    navigate('dashboard')
  })
  container.querySelector('#btn-view-all-incoming')?.addEventListener('click', () => navigate('incoming'))

  container.querySelectorAll('[data-packet-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.packetId
      navigate('import-confirm', { params: { packetId: id } })
    })
  })

  // Pending referral → employee detail
  container.querySelectorAll('.btn-view-referral').forEach(btn => {
    btn.addEventListener('click', () => {
      const empId = Number(btn.dataset.empId)
      navigate('employee-detail', { currentEmployee: { employee_id: empId } })
    })
  })
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
