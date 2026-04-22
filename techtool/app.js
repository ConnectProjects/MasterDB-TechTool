import { openDB, getSetting, getAllPackets } from './db/idb.js'
import { querySyncFolder }                   from '@shared/fs/sync-folder.js'
import { BrandLogo }                         from '@shared/components/brand-logo.js'
import { loadAndApplyTheme }                 from './theme.js'
import { renderLogin }          from './screens/login.js'
import { renderDashboard }      from './screens/dashboard.js'
import { renderSchedule }       from './screens/schedule.js'
import { renderCalendar }       from './screens/calendar.js'
import { renderCompany }        from './screens/company.js'
import { renderEmployeeList }   from './screens/employee-list.js'
import { renderQuestionnairePre }  from './screens/questionnaire-pre.js'
import { renderQuestionnairePost } from './screens/questionnaire-post.js'
import { renderTestEntry }      from './screens/test-entry.js'
import { renderClassification } from './screens/classification.js'
import { renderCounsel }        from './screens/counsel.js'
import { renderSubmit }         from './screens/submit.js'
import { renderSync }           from './screens/sync.js'
import { renderSettings }       from './screens/settings.js'
import { renderHelp }           from './screens/help.js'
import { renderTraining }       from './screens/training.js'
import { renderNewVisit }       from './screens/new-visit.js'

// ---------------------------------------------------------------------------
// App state — single mutable object passed to all screens
// ---------------------------------------------------------------------------

export const state = {
  screen:             'login',
  user:               null,       // { name, initials, tech_id, folder_name, iat_number }
  syncFolder:         null,       // FileSystemDirectoryHandle — set after folder auth
  logoUrl:            null,       // base64 data URL — loaded from IDB at boot
  packets:            [],         // all packets in IndexedDB
  currentPacket:      null,       // packet being worked on
  currentEmployee:    null,       // employee being tested
  currentThresholds:  {},         // threshold values from test entry — used by referral form
  testData:           {},         // in-progress threshold values
  classResult:        null,       // result from classify()
  counselText:        '',         // editable counsel text
  techNotes:          '',         // tech's internal notes
  referralGivenToWorker: false,   // set by checkbox on counsel screen
  lastSync:           null,       // ISO string of last sync
  helpReturnScreen:   null,       // screen to return to from help

  // Practice mode
  _inPracticeMode:    false,
  _realPackets:       null,
  _realUser:          null,
  practiceHintsSeen:  {},
  practiceCompleted:  false
}

// ---------------------------------------------------------------------------
// Screen registry
// ---------------------------------------------------------------------------

const SCREENS = {
  'login':          renderLogin,
  'dashboard':      renderDashboard,
  'schedule':       renderSchedule,
  'calendar':       renderCalendar,
  'company':        renderCompany,
  'employee-list':  renderEmployeeList,
  'questionnaire-pre': renderQuestionnairePre,
  'questionnaire-post': renderQuestionnairePost,
  'test-entry':     renderTestEntry,
  'classification': renderClassification,
  'counsel':        renderCounsel,
  'submit':         renderSubmit,
  'sync':           renderSync,
  'settings':       renderSettings,
  'help':           renderHelp,
  'training':       renderTraining,
  'new-visit':      renderNewVisit
}

const NAV_ITEMS = [
  { screen: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { screen: 'schedule',  label: 'Schedule',  icon: '📅' },
  { screen: 'calendar',  label: 'Calendar',  icon: '🗓' },
  { screen: 'settings',  label: 'Settings',  icon: '⚙'  },
  { screen: 'help',      label: 'Help',      icon: '?'  }
]

const NAV_PARENT = {
  'company':        'schedule',
  'employee-list':  'schedule',
  'questionnaire-pre': 'schedule',
  'questionnaire-post': 'schedule',
  'test-entry':     'schedule',
  'classification': 'schedule',
  'counsel':        'schedule',
  'submit':         'schedule',
  'sync':           'schedule',
  'training':       'settings',
  'new-visit':      'new-visit'
}

function isNavActive(current, navScreen) {
  return current === navScreen || NAV_PARENT[current] === navScreen
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export function navigate(screen, params = {}) {
  if (!SCREENS[screen]) {
    console.error('Unknown screen:', screen)
    return
  }
  if (screen === 'help') {
    state.helpReturnScreen = state.screen
  }
  // Reset per-employee state when moving to a new employee
  if (screen === 'questionnaire-pre') {
    state.questionnaire          = null
    state.currentThresholds      = {}
    state.referralGivenToWorker  = false
    state.counselText            = ''
    state.techNotes              = ''
    state.classResult            = null
  }
  state.screen = screen
  Object.assign(state, params)
  paint()
}

function paint() {
  const app = document.getElementById('app')

  const renderFn = SCREENS[state.screen]
  if (!renderFn) {
    app.innerHTML = `<div class="error-screen"><h2>Unknown screen: ${state.screen}</h2></div>`
    return
  }

  // Login renders full-screen (no sidebar)
  if (state.screen === 'login') {
    app.innerHTML = ''
    renderFn(app, state, navigate)
    return
  }

  const techName = state.user?.name ?? 'Tech'

  app.innerHTML = `
    <div class="app-shell">
      <nav class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          ${state.logoUrl
            ? `<img src="${state.logoUrl}" class="sidebar-logo-img" alt="Company logo" />`
            : `<div class="sidebar-logo-img">${BrandLogo}</div>`
          }
        </div>
        <ul class="sidebar-nav">
          ${NAV_ITEMS.map(item => `
            <li>
              <button class="nav-item ${isNavActive(state.screen, item.screen) ? 'nav-item--active' : ''}"
                data-screen="${item.screen}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.label}</span>
              </button>
            </li>
          `).join('')}
          <li style="padding:8px 8px 2px">
            <button class="nav-item nav-item--offline ${state.screen === 'new-visit' ? 'nav-item--active' : ''}"
              id="btn-new-visit">
              <span class="nav-icon">📋</span>
              <span class="nav-label">New Offline Visit</span>
            </button>
          </li>
        </ul>
        <div class="sidebar-footer">
          <span class="user-name">${techName}</span>
          ${state._inPracticeMode
            ? `<span class="folder-indicator" style="color:#7dd3fc">🎓 Practice</span>`
            : `<span class="folder-indicator ${state.syncFolder ? 'folder-ok' : 'folder-none'}"
                title="${state.syncFolder ? 'Sync folder connected' : 'No sync folder — go to Settings'}">
                ${state.syncFolder ? '●' : '○'} Sync
              </span>`
          }
        </div>
      </nav>
      <div class="main-area">
        <div id="main-content" class="main-content"></div>
      </div>
    </div>
  `

  app.querySelectorAll('.nav-item[data-screen]').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Prevent navigating away from practice mid-session via sidebar
      if (state._inPracticeMode && !['settings','help'].includes(btn.dataset.screen)) {
        if (!confirm('Exit practice mode? Your progress will be lost.')) return
        const { exitPracticeMode } = await import('./screens/practice-overlay.js')
        exitPracticeMode(state, navigate)
        return
      }
      navigate(btn.dataset.screen)
    })
  })

  app.querySelector('#btn-new-visit')?.addEventListener('click', () => navigate('new-visit'))

  renderFn(document.getElementById('main-content'), state, navigate)
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  const techName       = await getSetting('tech_name')
  const techInitials   = await getSetting('tech_initials')
  const techFolderName = await getSetting('tech_folder_name')
  const techIatNumber  = await getSetting('tech_iat_number')

  state.logoUrl = (await getSetting('logo_url')) ?? null
  await loadAndApplyTheme()

  if (techName && techInitials) {
    state.user = {
      name:        techName,
      initials:    techInitials,
      tech_id:     techInitials,
      folder_name: techFolderName ?? null,
      iat_number:  techIatNumber  ?? null
    }
    state.packets    = await getAllPackets()
    state.syncFolder = await querySyncFolder()
    navigate('dashboard')
  } else {
    navigate('login')
  }
}

// ---------------------------------------------------------------------------
// Service worker
// ---------------------------------------------------------------------------

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(e =>
    console.warn('Service worker registration failed:', e)
  )
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

openDB()
  .then(boot)
  .catch(err => {
    document.getElementById('app').innerHTML = `
      <div class="error-screen">
        <h2>Startup Error</h2>
        <p>TechTool could not initialize. Try clearing browser data and reloading.</p>
        <pre>${err.message}</pre>
      </div>
    `
  })
