/**
 * techtool/screens/new-visit.js
 *
 * Create a local (offline) packet without needing MasterDB or a sync folder.
 * Used when a tech arrives on-site with no internet connection.
 *
 * Workflow:
 *   1. Tech fills in company details + province
 *   2. Tech adds employees (same fields as MasterDB)
 *   3. Tap "Create Packet" → saves to IndexedDB, navigates to Dashboard
 *   4. Tech taps the new card on Dashboard → normal testing workflow
 *   5. On submit, packet goes to sync folder inbox as OFFLINE-{province}-...
 */

import { savePacket, getAllPackets } from '../db/idb.js'
import { PACKET_STATUS }            from '@shared/packet/schema.js'

const PROVINCES = [
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'ON', name: 'Ontario' }
]

export async function renderNewVisit(container, state, navigate) {
  // Local employee list — built up before packet creation
  let employees = []

  render()

  function render() {
    container.innerHTML = `
      <div class="screen">
        <header class="app-header">
          <button class="btn btn-ghost" id="btn-back">‹ Dashboard</button>
          <h1 class="app-title">New Offline Visit</h1>
        </header>

        <main class="screen-body" style="max-width:600px;padding:16px">

          <div class="alert alert-warn" style="margin-bottom:16px">
            📵 <strong>Offline mode</strong> — this packet will be stored on your device and submitted to the office when you have a connection.
          </div>

          <!-- Company section -->
          <div class="nv-section">
            <div class="nv-section-title">Company</div>

            <div class="form-group">
              <label>Company Name <span class="req">*</span></label>
              <input id="nv-co-name" type="text" placeholder="e.g. Sunrise Milling LP"
                value="${esc(state._nvDraft?.coName ?? '')}" />
            </div>

            <div class="form-group">
              <label>Province <span class="req">*</span></label>
              <select id="nv-province">
                <option value="">— select —</option>
                ${PROVINCES.map(p =>
                  `<option value="${p.code}" ${(state._nvDraft?.province ?? 'BC') === p.code ? 'selected' : ''}>${p.code} — ${p.name}</option>`
                ).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Visit Date <span class="req">*</span></label>
              <input id="nv-date" type="date" value="${state._nvDraft?.visitDate ?? new Date().toISOString().slice(0,10)}" />
            </div>

            <div class="nv-row-2">
              <div class="form-group">
                <label>Address</label>
                <input id="nv-co-address" type="text" placeholder="Street address"
                  value="${esc(state._nvDraft?.coAddress ?? '')}" />
              </div>
              <div class="form-group">
                <label>Contact Name</label>
                <input id="nv-co-contact" type="text" placeholder="Site contact name"
                  value="${esc(state._nvDraft?.coContact ?? '')}" />
              </div>
            </div>

            <div class="nv-row-2">
              <div class="form-group">
                <label>Contact Phone</label>
                <input id="nv-co-phone" type="tel" placeholder="250-555-0100"
                  value="${esc(state._nvDraft?.coPhone ?? '')}" />
              </div>
              <div class="form-group">
                <label>Contact Email</label>
                <input id="nv-co-email" type="email" placeholder="contact@company.com"
                  value="${esc(state._nvDraft?.coEmail ?? '')}" />
              </div>
            </div>

            <div class="form-group">
              <label>Notes <span class="label-hint">— internal, travels with packet</span></label>
              <textarea id="nv-co-notes" rows="2" placeholder="e.g. Ask for Bob at the gate">${esc(state._nvDraft?.coNotes ?? '')}</textarea>
            </div>
          </div>

          <!-- Employees section -->
          <div class="nv-section">
            <div class="nv-section-header">
              <div class="nv-section-title">Employees <span class="nv-emp-count">(${employees.length})</span></div>
              <button class="btn btn-outline btn-sm" id="btn-add-emp">+ Add Employee</button>
            </div>

            ${employees.length === 0
              ? '<p class="empty-note" style="padding:12px 0">No employees added yet. Tap + Add Employee to begin.</p>'
              : `<div class="nv-emp-list">
                  ${employees.map((e, i) => `
                    <div class="nv-emp-row">
                      <div class="nv-emp-info">
                        <span class="nv-emp-name">${esc(e.last_name)}, ${esc(e.first_name)}</span>
                        ${e.job_title ? `<span class="nv-emp-meta">${esc(e.job_title)}</span>` : ''}
                        ${e.dob ? `<span class="nv-emp-meta">DOB: ${esc(e.dob)}</span>` : ''}
                      </div>
                      <button class="btn btn-ghost btn-sm nv-btn-remove-emp" data-idx="${i}"
                        style="color:var(--red)">✕</button>
                    </div>
                  `).join('')}
                </div>`
            }
          </div>

          <!-- Add employee form (hidden by default) -->
          <div id="nv-emp-form" class="nv-emp-form hidden">
            <div class="nv-section-title" style="margin-bottom:10px">New Employee</div>
            <div class="nv-row-2">
              <div class="form-group">
                <label>First Name <span class="req">*</span></label>
                <input id="ef-first" type="text" />
              </div>
              <div class="form-group">
                <label>Last Name <span class="req">*</span></label>
                <input id="ef-last" type="text" />
              </div>
            </div>
            <div class="nv-row-2">
              <div class="form-group">
                <label>Date of Birth</label>
                <input id="ef-dob" type="date" />
              </div>
              <div class="form-group">
                <label>Hire Date</label>
                <input id="ef-hire" type="date" />
              </div>
            </div>
            <div class="nv-row-2">
              <div class="form-group">
                <label>Job Title</label>
                <input id="ef-title" type="text" />
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="ef-status">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div class="nv-emp-form-actions">
              <button class="btn btn-ghost btn-sm" id="btn-cancel-emp">Cancel</button>
              <button class="btn btn-primary btn-sm" id="btn-save-emp">Add Employee</button>
            </div>
          </div>

          <!-- Create button -->
          <div id="nv-msg" class="alert hidden" style="margin-top:12px"></div>
          <button class="btn btn-primary" id="btn-create" style="width:100%;margin-top:16px;padding:12px;font-size:15px">
            📋 Create Offline Packet
          </button>

        </main>
      </div>
    `

    wireEvents()
  }

  function wireEvents() {
    container.querySelector('#btn-back').addEventListener('click', () => {
      state._nvDraft = null
      navigate('dashboard')
    })

    // Show/hide employee form
    container.querySelector('#btn-add-emp').addEventListener('click', () => {
      container.querySelector('#nv-emp-form').classList.remove('hidden')
      container.querySelector('#ef-first').focus()
    })

    container.querySelector('#btn-cancel-emp')?.addEventListener('click', () => {
      container.querySelector('#nv-emp-form').classList.add('hidden')
      clearEmpForm()
    })

    container.querySelector('#btn-save-emp')?.addEventListener('click', () => {
      const fn = container.querySelector('#ef-first').value.trim()
      const ln = container.querySelector('#ef-last').value.trim()
      if (!fn || !ln) {
        alert('First and last name are required.')
        return
      }
      saveDraft()
      employees.push({
        employee_id:     'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        first_name:      fn,
        last_name:       ln,
        dob:             container.querySelector('#ef-dob').value  || null,
        hire_date:       container.querySelector('#ef-hire').value || null,
        job_title:       container.querySelector('#ef-title').value.trim() || null,
        status:          container.querySelector('#ef-status').value,
        baseline:        null,
        prior_tests:     [],
        completed_tests: [],
        new_employee:    true
      })
      render()
    })

    // Remove employee
    container.querySelectorAll('.nv-btn-remove-emp').forEach(btn => {
      btn.addEventListener('click', () => {
        saveDraft()
        employees.splice(Number(btn.dataset.idx), 1)
        render()
      })
    })

    // Create packet
    container.querySelector('#btn-create').addEventListener('click', async () => {
      const msg = container.querySelector('#nv-msg')

      const coName   = container.querySelector('#nv-co-name').value.trim()
      const province = container.querySelector('#nv-province').value
      const date     = container.querySelector('#nv-date').value

      if (!coName)   { showMsg(msg, 'error', 'Company name is required.');  return }
      if (!province) { showMsg(msg, 'error', 'Province is required.');       return }
      if (!date)     { showMsg(msg, 'error', 'Visit date is required.');     return }
      if (employees.length === 0) {
        showMsg(msg, 'error', 'Add at least one employee before creating the packet.')
        return
      }

      const btn = container.querySelector('#btn-create')
      btn.disabled    = true
      btn.textContent = 'Creating…'

      try {
        // Load province rules + counsel from shared JSON files
        const [rulesData, counselData] = await Promise.all([
          fetchJson(`../shared/rules/${province}.json`),
          fetchJson(`../shared/counsel/${province}.json`)
        ])

        const rules    = rulesData?.rules            ?? []
        const counsel  = counselData?.templates      ?? []

        const tech      = state.user
        const initials  = tech?.initials ?? 'XX'
        const slug      = coName.replace(/[^A-Za-z0-9]/g, '').slice(0, 20)
        const dateCompact = date.replace(/-/g, '')
        const packetId  = `OFFLINE-${province}-${slug}-${dateCompact}-${initials}`
        const filename  = `OFFLINE_${slug}_${date}_${initials}.json`

        const packet = {
          packet_id:      packetId,
          filename,
          schema_version: '1.0',
          status:         PACKET_STATUS.SYNCED,
          _is_offline:    true,
          created_at:     new Date().toISOString(),
          updated_at:     new Date().toISOString(),

          tech: {
            tech_id:       tech?.tech_id   ?? initials,
            tech_initials: initials
          },

          visit: {
            visit_date: date,
            province
          },

          company: {
            company_id:    'offline_' + Date.now(),
            name:          coName,
            province,
            address:       container.querySelector('#nv-co-address').value.trim() || null,
            contact_name:  container.querySelector('#nv-co-contact').value.trim() || null,
            contact_phone: container.querySelector('#nv-co-phone').value.trim()   || null,
            contact_email: container.querySelector('#nv-co-email').value.trim()   || null,
            sticky_notes:  container.querySelector('#nv-co-notes').value.trim()   || null
          },

          rules,
          counsel_templates: counsel,
          hpd_inventory: [],
          employees,
          submitted_at: null,
          submitted_by: null
        }

        await savePacket(packet)
        state.packets    = await getAllPackets()
        state._nvDraft   = null

        navigate('dashboard')
      } catch (e) {
        showMsg(msg, 'error', `Could not create packet: ${e.message}`)
        btn.disabled    = false
        btn.textContent = '📋 Create Offline Packet'
      }
    })
  }

  function saveDraft() {
    state._nvDraft = {
      coName:    container.querySelector('#nv-co-name')?.value.trim()  ?? '',
      province:  container.querySelector('#nv-province')?.value        ?? 'BC',
      visitDate: container.querySelector('#nv-date')?.value            ?? '',
      coAddress: container.querySelector('#nv-co-address')?.value.trim() ?? '',
      coContact: container.querySelector('#nv-co-contact')?.value.trim() ?? '',
      coPhone:   container.querySelector('#nv-co-phone')?.value.trim()   ?? '',
      coEmail:   container.querySelector('#nv-co-email')?.value.trim()   ?? '',
      coNotes:   container.querySelector('#nv-co-notes')?.value.trim()   ?? ''
    }
  }

  function clearEmpForm() {
    ;['#ef-first','#ef-last','#ef-dob','#ef-hire','#ef-title'].forEach(id => {
      const el = container.querySelector(id)
      if (el) el.value = ''
    })
    const status = container.querySelector('#ef-status')
    if (status) status.value = 'active'
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function showMsg(el, type, msg) {
  el.className   = `alert alert-${type}`
  el.textContent = msg
  el.classList.remove('hidden')
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
