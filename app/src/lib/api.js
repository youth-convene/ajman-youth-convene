import { normalizeMobile } from './phone'

const API_URL = (import.meta.env.VITE_API_URL || '').trim()

/** With no API URL configured the app runs against localStorage so it can be tried out. */
export const DEMO_MODE = !API_URL

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

async function call(action, payload = {}) {
  if (DEMO_MODE) return demo(action, payload)

  let res
  try {
    // text/plain avoids a CORS preflight, which Apps Script web apps don't answer.
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', 'NETWORK')
  }
  if (!res.ok) throw new ApiError(`Server error (${res.status}). Please try again.`, 'SERVER')
  const data = await res.json()
  if (!data.ok) throw new ApiError(data.error || 'Request failed.', data.code)
  return data
}

export const api = {
  register: (form) => call('register', form),
  retrieve: (mobile, email) => call('retrieve', { mobile, email }),
  checkin: (id, key) => call('checkin', { id, key }),
  stats: (key) => call('stats', { key }),
}

/* ------------------------------------------------------------------ */
/* Demo backend – mirrors google-apps-script/Code.gs using localStorage */
/* ------------------------------------------------------------------ */

const DEMO_KEY = 'azyc-demo-registrations'
const load = () => JSON.parse(localStorage.getItem(DEMO_KEY) || '[]')
const save = (rows) => localStorage.setItem(DEMO_KEY, JSON.stringify(rows))
const now = () => new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })

function newId(rows) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id
  do {
    id = 'AZYC-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  } while (rows.some((r) => r.id === id))
  return id
}

async function demo(action, p) {
  await new Promise((r) => setTimeout(r, 350))
  const rows = load()
  switch (action) {
    case 'register': {
      const mobile = normalizeMobile(p.mobile)
      if (rows.some((r) => r.mobile === mobile))
        throw new ApiError('This mobile number is already registered.', 'DUPLICATE')
      const record = {
        id: newId(rows),
        name: p.name.trim(),
        mobile,
        email: p.email.trim().toLowerCase(),
        sector: p.sector,
        designation: p.designation,
        attended: false,
        checkInTime: '',
        timestamp: now(),
      }
      save([...rows, record])
      return { ok: true, record }
    }
    case 'retrieve': {
      const mobile = normalizeMobile(p.mobile)
      const record = rows.find((r) => r.mobile === mobile && r.email === p.email.trim().toLowerCase())
      if (!record) throw new ApiError('No registration found for this mobile number and email.', 'NOT_FOUND')
      return { ok: true, record }
    }
    case 'checkin': {
      const id = String(p.id || '').trim().toUpperCase()
      const record = rows.find((r) => r.id === id)
      if (!record) throw new ApiError(`No registration found for "${id}".`, 'NOT_FOUND')
      if (record.attended) return { ok: true, status: 'ALREADY', record }
      record.attended = true
      record.checkInTime = now()
      save(rows)
      return { ok: true, status: 'CHECKED_IN', record }
    }
    case 'stats':
      return { ok: true, total: rows.length, attended: rows.filter((r) => r.attended).length }
    default:
      throw new ApiError('Unknown action')
  }
}
