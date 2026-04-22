export function renderQuestionnairePre(container, state, navigate) {
  const emp = state.currentEmployee

  if (!state.questionnaire) state.questionnaire = {}
  if (!state.questionnaire.pre) {
    state.questionnaire.pre = {
      noise_2h: false,
      noise_2h_duration: '',
      noise_work: false,
      hpd_type: '',
      hpd_trained: false
    }
  }

  const q = state.questionnaire.pre

  container.innerHTML = `
    <div class="screen">
      <header class="app-header">
        <button class="btn btn-ghost" id="btn-back">‹ Employees</button>
        <h1 class="app-title">Pre-Test: ${esc(emp.last_name)}, ${esc(emp.first_name)}</h1>
      </header>

      <main class="screen-body">
        <div class="q-card">
          <div class="q-title">Recent Exposure</div>
          
          <div class="q-item">
            <label class="checkbox-label">
              <input type="checkbox" id="q-noise-2h" ${q.noise_2h ? 'checked' : ''}>
              Exposed to hazardous noise in last 2 hours?
            </label>
          </div>

          <div id="noise-2h-detail" class="q-sub-group" style="display: ${q.noise_2h ? 'block' : 'none'}">
            <div class="form-group" style="margin-bottom:0">
              <label>For how long?</label>
              <select id="q-noise-2h-duration" class="select-input">
                <option value="">— Select duration —</option>
                <option value="under 2 hrs" ${q.noise_2h_duration === 'under 2 hrs' ? 'selected' : ''}>Under 2 hrs</option>
                <option value="2-4 hrs" ${q.noise_2h_duration === '2-4 hrs' ? 'selected' : ''}>2-4 hrs</option>
                <option value="4 or more hrs" ${q.noise_2h_duration === '4 or more hrs' ? 'selected' : ''}>4 or more hrs</option>
              </select>
            </div>
          </div>
        </div>

        <div class="q-card">
          <div class="q-title">Work Habits</div>

          <div class="q-item">
            <label class="checkbox-label">
              <input type="checkbox" id="q-noise-work" ${q.noise_work ? 'checked' : ''}>
              Usually exposed to hazardous noise at work?
            </label>
          </div>

          <div id="hpd-detail" class="q-sub-group" style="display: ${q.noise_work ? 'block' : 'none'}">
            <div class="form-group" style="margin-bottom:0">
              <label>What kind of hearing protection (HPD) do you use?</label>
              <select id="q-hpd-type" class="select-input">
                <option value="">— Select type —</option>
                <option value="plugs" ${q.hpd_type === 'plugs' ? 'selected' : ''}>Plugs</option>
                <option value="foam plugs" ${q.hpd_type === 'foam plugs' ? 'selected' : ''}>Foam Plugs</option>
                <option value="ear muffs" ${q.hpd_type === 'ear muffs' ? 'selected' : ''}>Ear Muffs</option>
                <option value="dual" ${q.hpd_type === 'dual' ? 'selected' : ''}>Dual (Plugs + Muffs)</option>
                <option value="custom molded plugs" ${q.hpd_type === 'custom molded plugs' ? 'selected' : ''}>Custom Molded Plugs</option>
              </select>
            </div>
          </div>

          <div class="q-item">
            <label class="checkbox-label">
              <input type="checkbox" id="q-hpd-trained" ${q.hpd_trained ? 'checked' : ''}>
              Trained by employer on use of HPDs?
            </label>
          </div>
        </div>
      </main>

      <footer class="action-bar">
        <button class="btn btn-primary" id="btn-next">Continue to Test →</button>
      </footer>
    </div>
  `

  const noise2hCheck = container.querySelector('#q-noise-2h')
  const noise2hDetail = container.querySelector('#noise-2h-detail')
  noise2hCheck.addEventListener('change', () => {
    noise2hDetail.style.display = noise2hCheck.checked ? 'block' : 'none'
  })

  const noiseWorkCheck = container.querySelector('#q-noise-work')
  const hpdDetail = container.querySelector('#hpd-detail')
  noiseWorkCheck.addEventListener('change', () => {
    hpdDetail.style.display = noiseWorkCheck.checked ? 'block' : 'none'
  })

  container.querySelector('#btn-back').addEventListener('click', () => navigate('employee-list'))

  container.querySelector('#btn-next').addEventListener('click', () => {
    state.questionnaire.pre = {
      noise_2h:          container.querySelector('#q-noise-2h').checked,
      noise_2h_duration: container.querySelector('#q-noise-2h-duration').value,
      noise_work:        container.querySelector('#q-noise-work').checked,
      hpd_type:          container.querySelector('#q-hpd-type').value,
      hpd_trained:       container.querySelector('#q-hpd-trained').checked
    }
    navigate('test-entry')
  })
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
