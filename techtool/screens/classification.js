import { renderAudiogram } from '../components/audiogram.js'

const RESULT_CONFIG = {
  N:   { label: 'Normal',               cls: 'result--green'  },
  EW:  { label: 'Early Warning',        cls: 'result--yellow' },
  A:   { label: 'Abnormal',             cls: 'result--red'    },
  NC:  { label: 'No Change',            cls: 'result--green'  },
  EWC: { label: 'Early Warning Change', cls: 'result--yellow' },
  AC:  { label: 'Abnormal Change',      cls: 'result--red'    }
}

export function renderClassification(container, state, navigate) {
  const result   = state.classResult
  const emp      = state.currentEmployee
  const test     = state.testData ?? {}
  const baseline = emp?.baseline?.thresholds ?? null

  const cfg = RESULT_CONFIG[result?.category] ?? { label: result?.category ?? '?', cls: 'result--neutral', icon: '?' }
  const hasDetail = result?.triggered_rule_id != null

  container.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <button class="btn btn-ghost" id="btn-back">‹ Re-enter</button>
        <h1 class="app-title">Classification</h1>
      </header>

      <main class="screen-body">
        <div class="result-chip ${cfg.cls}">
          <span class="result-dot">${result?.category ?? '?'}</span>
          <span class="result-label">${cfg.label}</span>
        </div>

        ${hasDetail ? `
          <div class="result-detail-card">
            <div class="detail-row">
              <span class="detail-key">Triggering rule</span>
              <span class="detail-val">Rule #${result.triggered_rule_id}</span>
            </div>
            ${result.triggering_freq_hz != null ? `
              <div class="detail-row">
                <span class="detail-key">Frequency</span>
                <span class="detail-val">${result.triggering_freq_hz} Hz</span>
              </div>` : ''}
            ${result.triggering_ear ? `
              <div class="detail-row">
                <span class="detail-key">Ear</span>
                <span class="detail-val">${cap(result.triggering_ear)}</span>
              </div>` : ''}
            ${result.shift_db != null ? `
              <div class="detail-row">
                <span class="detail-key">${result.no_baseline ? 'Threshold' : 'Shift'}</span>
                <span class="detail-val">${result.shift_db} dB</span>
              </div>` : ''}
            ${result.no_baseline ? `
              <div class="detail-row">
                <span class="detail-key">Baseline</span>
                <span class="detail-val detail-warn">No baseline on file</span>
              </div>` : ''}
            ${result.followup_months != null ? `
              <div class="detail-row">
                <span class="detail-key">Follow-up</span>
                <span class="detail-val detail-warn">Retest within ${result.followup_months} months</span>
              </div>` : ''}
            ${result.requires_referral ? `
              <div class="detail-row">
                <span class="detail-key">Referral</span>
                <span class="detail-val detail-warn">Medical referral required</span>
              </div>` : ''}
          </div>
        ` : `
          <div class="result-detail-card">
            <p class="detail-normal">No rule triggered — within normal limits.</p>
            ${result?.no_baseline ? '<p class="detail-warn">No baseline on file for this employee.</p>' : ''}
          </div>
        `}

        <div class="audiogram-inset">
          <div id="audiogram-here"></div>
        </div>
      </main>

      <footer class="action-bar">
        <button class="btn btn-ghost" id="btn-reenter">Re-enter thresholds</button>
        <button class="btn btn-primary" id="btn-counsel">Counsel →</button>
      </footer>
    </div>
  `

  container.querySelector('#audiogram-here').appendChild(
    renderAudiogram({ current: test, baseline })
  )

  container.querySelector('#btn-back').addEventListener('click',    () => navigate('test-entry'))
  container.querySelector('#btn-reenter').addEventListener('click', () => navigate('test-entry'))
  container.querySelector('#btn-counsel').addEventListener('click', () => navigate('counsel'))
}

function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}
