import { renderAudiogram }                     from '../components/audiogram.js'
import { classify }                            from '@shared/classification/engine.js'
import { validateThresholds } from '@shared/validation/thresholds.js'
import { saveDraft, getDraft }                  from '../db/idb.js'

const EARS        = ['right', 'left']
const FREQ_SUFFIX = ['500', '1k', '2k', '3k', '4k', '6k', '8k']
const FREQ_LABELS = ['500', '1k', '2k', '3k', '4k', '6k', '8k']

// Pre-built options for the threshold dropdowns (0–100 × 5, plus NR)
function threshOptions(currentVal) {
  const cur = currentVal === undefined || currentVal === null ? '' : String(currentVal)
  let html = `<option value=""${cur === '' ? ' selected' : ''}>—</option>`
  for (let v = 0; v <= 100; v += 5) {
    html += `<option value="${v}"${String(v) === cur ? ' selected' : ''}>${v}</option>`
  }
  html += `<option value="NR"${cur === 'NR' ? ' selected' : ''}>NR</option>`
  return html
}

export async function renderTestEntry(container, state, navigate) {
  const emp      = state.currentEmployee
  const packet   = state.currentPacket
  const baseline = emp.baseline?.thresholds ?? null

  // Restore draft if one exists
  const draft = await getDraft(packet.packet_id, emp.employee_id)
  if (draft && Object.keys(state.testData).length === 0) {
    Object.assign(state.testData, draft)
  }
  const test = state.testData

  const testType = emp.baseline ? 'Periodic' : 'Baseline'

  container.innerHTML = `
    <div class="screen screen-test">
      <header class="app-header">
        <button class="btn btn-ghost" id="btn-back">‹ Pre-Test</button>
        <h1 class="app-title">${esc(emp.last_name)}, ${esc(emp.first_name)}</h1>
        <span class="test-type-chip">${testType}</span>
      </header>

      <main class="test-layout">
        <!-- Left column: threshold grid -->
        <div class="threshold-panel">
          <div class="panel-title">Threshold Entry</div>

          <table class="thresh-table">
            <thead>
              <tr>
                <th></th>
                ${FREQ_LABELS.map(f => `<th>${f}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${EARS.map(ear => `
                <tr data-ear="${ear}">
                  <th class="ear-th ear-${ear}">${ear === 'left' ? 'L' : 'R'}</th>
                  ${FREQ_SUFFIX.map(freq => {
                    const key = `${ear}_${freq}`
                    return `<td><select class="thresh-cell" data-key="${key}">${threshOptions(test[key])}</select></td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div id="thresh-errors" class="alert alert-error hidden"></div>

          <div class="thresh-actions">
            <button class="btn btn-ghost btn-sm" id="btn-clear">Clear All</button>
            <button class="btn btn-outline btn-sm" id="btn-draft">Save Draft</button>
            <button class="btn btn-primary" id="btn-classify">Classify →</button>
          </div>
        </div>

        <!-- Right column: live audiogram -->
        <div class="audiogram-panel" id="audiogram-panel">
          <!-- rendered by JS -->
        </div>
      </main>
    </div>
  `

  // Render initial audiogram
  repaintAudiogram(container, test, baseline)

  // Threshold change handlers
  container.querySelectorAll('.thresh-cell').forEach(sel => {
    sel.addEventListener('change', () => {
      const key = sel.dataset.key
      const val = sel.value
      if (val === '') {
        delete test[key]
        sel.classList.remove('filled')
      } else {
        test[key] = val === 'NR' ? 'NR' : parseInt(val, 10)
        sel.classList.add('filled')
      }
      repaintAudiogram(container, test, baseline)
    })
  })

  container.querySelector('#btn-back').addEventListener('click', () => navigate('questionnaire-pre'))

  container.querySelector('#btn-clear').addEventListener('click', () => {
    if (!confirm('Clear all entered thresholds?')) return
    Object.keys(test).forEach(k => delete test[k])
    container.querySelectorAll('.thresh-cell').forEach(sel => {
      sel.value = ''
      sel.classList.remove('filled')
    })
    repaintAudiogram(container, test, baseline)
  })

  container.querySelector('#btn-draft').addEventListener('click', async () => {
    await saveDraft(packet.packet_id, emp.employee_id, test)
    showToast('Draft saved')
  })

  container.querySelector('#btn-classify').addEventListener('click', () => {
    doClassify(container, state, navigate)
  })
}

// ---------------------------------------------------------------------------
// Audiogram refresh
// ---------------------------------------------------------------------------

function repaintAudiogram(container, test, baseline) {
  const panel = container.querySelector('#audiogram-panel')
  panel.innerHTML = ''
  panel.appendChild(renderAudiogram({ current: test, baseline }))
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function doClassify(container, state, navigate) {
  const errEl   = container.querySelector('#thresh-errors')
  const test    = state.testData
  const emp     = state.currentEmployee
  const packet  = state.currentPacket

  // Must have at least one ear
  const hasAny = Object.values(test).some(v => v !== undefined && v !== null)
  if (!hasAny) {
    errEl.textContent = 'Enter at least one threshold before classifying.'
    errEl.classList.remove('hidden')
    return
  }

  const { valid, errors } = validateThresholds(test)
  if (!valid) {
    errEl.textContent = 'Fix invalid values: ' + errors.join('; ')
    errEl.classList.remove('hidden')
    return
  }

  errEl.classList.add('hidden')

  const rules    = packet.rules ?? []
  const baseline = emp.baseline?.thresholds ?? null
  const result   = classify(test, baseline, rules)

  // Auto-generate counsel from template
  const template = (packet.counsel_templates ?? []).find(t => t.category_code === result.category)
  let counselText = ''
  if (template) {
    counselText = template.summary_text
      .replace(/\[freq\]/g,  result.triggering_freq_hz != null ? String(result.triggering_freq_hz) : '')
      .replace(/\[ear\]/g,   result.triggering_ear ?? '')
      .replace(/\[date\]/g,  emp.baseline?.test_date ?? '')
      .replace(/\[shift\]/g, result.shift_db != null ? String(result.shift_db) : '')
  }

  navigate('questionnaire-post', { classResult: result, counselText })
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function showToast(msg) {
  const el = document.createElement('div')
  el.className   = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('toast--visible'))
  setTimeout(() => { el.classList.remove('toast--visible'); setTimeout(() => el.remove(), 300) }, 2200)
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
