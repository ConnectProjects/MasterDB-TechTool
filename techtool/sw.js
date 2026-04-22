const CACHE = 'hcp-techtool-v2'

const APP_SHELL = [
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  '/shared/components/brand-logo.png',
  './theme.js',
  './db/idb.js',
  './components/audiogram.js',
  './components/hpd-calc.js',
  './screens/login.js',
  './screens/dashboard.js',
  './screens/schedule.js',
  './screens/calendar.js',
  './screens/company.js',
  './screens/employee-list.js',
  './screens/questionnaire-pre.js',
  './screens/questionnaire-post.js',
  './screens/test-entry.js',
  './screens/classification.js',
  './screens/counsel.js',
  './screens/hpd.js',
  './screens/submit.js',
  './screens/sync.js',
  './screens/settings.js',
  './screens/help.js',
  './screens/training.js',
  './screens/new-visit.js',
  './screens/practice-overlay.js',
  './data/practice-packet.js',
  '../shared/classification/engine.js',
  '../shared/validation/thresholds.js',
  '../shared/packet/schema.js',
  '../shared/fs/sync-folder.js',
  '../shared/auth/msal-stub.js'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Pass through Graph API and MSAL requests — never intercept auth
  const url = e.request.url
  if (url.includes('graph.microsoft.com') || url.includes('login.microsoftonline.com')) {
    return
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})
