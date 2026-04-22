/**
 * TechTool theme color management.
 * Reads/writes from IndexedDB (async), applies as CSS variable overrides.
 * Mirrors masterdb/theme.js but uses IDB instead of SQLite.
 */

import { getSetting, setSetting } from './db/idb.js'

export const DEFAULT_COLOR = '#76B214'

export async function loadAndApplyTheme() {
  const hex = (await getSetting('theme_color')) ?? DEFAULT_COLOR
  applyTheme(hex)
  return hex
}

export async function saveThemeColor(hex) {
  await setSetting('theme_color', hex)
}

export function applyTheme(hex) {
  const [h, s, l] = hexToHsl(hex)
  // Use the color itself for the sidebar/header background to match brand logos exactly
  const light = hslToHex(h, Math.min(s * 0.5, 55),  94)
  const root  = document.documentElement.style
  root.setProperty('--blue-mid',   hex)
  root.setProperty('--blue',       hex)
  root.setProperty('--blue-light', light)
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6;               break
      case b: h = ((r - g) / d + 4) / 6;               break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return '#' + [r, g, b]
    .map(x => Math.round(x * 255).toString(16).padStart(2, '0'))
    .join('')
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}
