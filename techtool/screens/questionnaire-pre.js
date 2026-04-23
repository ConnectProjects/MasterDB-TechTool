export function renderQuestionnairePre(container, state, navigate) {
  const emp = state.currentEmployee

  if (!state.questionnaire) state.questionnaire = {}
  if (!state.questionnaire.pre) {
    state.questionnaire.pre = {
      noise_2h: false,
      noise_2h_duration: '',
      wear_hpd: false,
      employer_info: false
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
          <div class="q-title">Noise Exposure & Information</div>
          
          <div class="q-item">
            <label class="checkbox-label">
              <input type="checkbox" id="q-noise-2h" ${q.noise_2h ? 'checked' : ''}>
              Have you been exposed to noise within the last two hours?
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

          <div class="q-item">
            <label class="checkbox-label">
              <input type="checkbox" id="q-wear-hpd" ${q.wear_hpd ? 'checked' : ''}>
              Do you regularly wear hearing protection when you work in a noisy environment?
            </label>
          </div>

          <div class="q-item">
            <label class="checkbox-label">
              <input type="checkbox" id="q-employer-info" ${q.employer_info ? 'checked' : ''}>
              Has your employer given you information about noise and noise induced hearing loss in the last year?
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

  container.querySelector('#btn-back').addEventListener('click', () => navigate('employee-list'))

  container.querySelector('#btn-next').addEventListener('click', () => {
    state.questionnaire.pre = {
      noise_2h:          container.querySelector('#q-noise-2h').checked,
      noise_2h_duration: container.querySelector('#q-noise-2h-duration').value,
      wear_hpd:          container.querySelector('#q-wear-hpd').checked,
      employer_info:     container.querySelector('#q-employer-info').checked
    }
    navigate('test-entry')
  })
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
