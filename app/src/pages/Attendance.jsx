import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api, DEMO_MODE } from '../lib/api'
import { formatMobile } from '../lib/phone'

const KEY_STORE = 'azyc-staff-key'
const RESCAN_GAP_MS = 4000 // ignore the same QR for this long after it was read

export default function Attendance() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORE) || '')
  const [stats, setStats] = useState(null)

  const refreshStats = useCallback(
    (k = key) =>
      api
        .stats(k)
        .then((s) => setStats(s))
        .catch(() => {}),
    [key],
  )

  if (!key) {
    return (
      <StaffLogin
        onOk={(k, s) => {
          sessionStorage.setItem(KEY_STORE, k)
          setKey(k)
          setStats(s)
        }}
      />
    )
  }

  return (
    <Scanner
      staffKey={key}
      stats={stats}
      refreshStats={refreshStats}
      onLogout={() => {
        sessionStorage.removeItem(KEY_STORE)
        setKey('')
      }}
    />
  )
}

function StaffLogin({ onOk }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(ev) {
    ev.preventDefault()
    setBusy(true)
    setError('')
    try {
      const s = await api.stats(value)
      onOk(value, s)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card narrow">
      <div className="card-head">
        <p className="eyebrow">Staff only</p>
        <h1>Attendance Desk</h1>
        <p className="sub">Enter the staff password to start scanning delegate passes.</p>
      </div>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span className="field-label">Staff password</span>
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </label>
        {DEMO_MODE && <p className="aside">Demo mode: any password works.</p>}
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" disabled={busy || !value}>
          {busy ? <span className="spinner" /> : 'Start scanning'}
        </button>
      </form>
    </section>
  )
}

function Scanner({ staffKey, stats, refreshStats, onLogout }) {
  const [camError, setCamError] = useState('')
  const [result, setResult] = useState(null) // {status, record?, message?}
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState('')
  const [log, setLog] = useState([])
  const busyRef = useRef(false)
  const lastRef = useRef({ code: '', at: 0 })

  const checkIn = useCallback(
    async (raw) => {
      const id = String(raw || '').trim().toUpperCase()
      if (!id || busyRef.current) return
      const now = Date.now()
      if (lastRef.current.code === id && now - lastRef.current.at < RESCAN_GAP_MS) return
      lastRef.current = { code: id, at: now }

      busyRef.current = true
      setBusy(true)
      try {
        const res = await api.checkin(id, staffKey)
        setResult(res)
        setLog((l) => [{ id, status: res.status, name: res.record.name, at: new Date() }, ...l].slice(0, 20))
        beep(res.status === 'CHECKED_IN' ? 880 : 440)
        refreshStats()
      } catch (err) {
        if (err.code === 'UNAUTHORIZED') return onLogout()
        setResult({ status: 'ERROR', message: err.message })
        setLog((l) => [{ id, status: 'ERROR', name: '—', at: new Date() }, ...l].slice(0, 20))
        beep(220)
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [staffKey, refreshStats, onLogout],
  )

  // Keep the camera callback pointed at the latest checkIn without restarting the camera.
  const checkInRef = useRef(checkIn)
  useEffect(() => {
    checkInRef.current = checkIn
  }, [checkIn])

  useEffect(() => {
    const qr = new Html5Qrcode('qr-reader', { verbose: false })
    let started = false
    let cancelled = false
    qr.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: (w, h) => {
          const s = Math.floor(Math.min(w, h) * 0.72)
          return { width: s, height: s }
        },
      },
      (text) => checkInRef.current(text),
      () => {},
    )
      .then(() => {
        started = true
        if (cancelled) qr.stop().then(() => qr.clear()).catch(() => {})
      })
      .catch((err) => {
        setCamError(
          /permission|notallowed/i.test(String(err))
            ? 'Camera permission was denied. Allow camera access in your browser settings and reload.'
            : 'Could not start the camera. Use the manual entry below, or open this page over HTTPS on a phone.',
        )
      })
    return () => {
      cancelled = true
      if (started) qr.stop().then(() => qr.clear()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return (
    <section className="card wide">
      <div className="card-head row-between">
        <div>
          <p className="eyebrow">Attendance Desk</p>
          <h1>Scan Delegate Pass</h1>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
          Lock
        </button>
      </div>

      <div className="stats">
        <div>
          <span>Registered</span>
          <strong>{stats?.total ?? '–'}</strong>
        </div>
        <div>
          <span>Checked in</span>
          <strong className="accent">{stats?.attended ?? '–'}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{stats ? stats.total - stats.attended : '–'}</strong>
        </div>
      </div>

      <div className="scan-grid">
        <div>
          <div className="reader-wrap">
            <div id="qr-reader" />
            {busy && (
              <div className="reader-busy">
                <span className="spinner" />
              </div>
            )}
          </div>
          {camError && <div className="alert alert-error">{camError}</div>}

          <form
            className="manual"
            onSubmit={(e) => {
              e.preventDefault()
              lastRef.current = { code: '', at: 0 }
              checkIn(manual)
              setManual('')
            }}
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Or type ID, e.g. AZYC-7K3F9Q"
              autoCapitalize="characters"
            />
            <button className="btn btn-primary btn-sm" disabled={!manual.trim() || busy}>
              Check in
            </button>
          </form>
        </div>

        <div>
          <ResultCard result={result} />
          {log.length > 0 && (
            <div className="log">
              <h2>Recent scans</h2>
              <ul>
                {log.map((l, i) => (
                  <li key={i} className={`log-${l.status}`}>
                    <span className="mono">{l.id}</span>
                    <span className="log-name">{l.name}</span>
                    <span className="log-time">{l.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ResultCard({ result }) {
  if (!result)
    return (
      <div className="result result-idle">
        <strong>Ready to scan</strong>
        <span>Point the camera at the QR code on a delegate's pass.</span>
      </div>
    )

  if (result.status === 'ERROR')
    return (
      <div className="result result-error" role="status">
        <span className="result-badge">✕ Not found</span>
        <strong>{result.message}</strong>
      </div>
    )

  const r = result.record
  const ok = result.status === 'CHECKED_IN'
  return (
    <div className={`result ${ok ? 'result-ok' : 'result-warn'}`} role="status">
      <span className="result-badge">{ok ? '✓ Checked in' : '! Already checked in'}</span>
      <strong className="result-name">{r.name}</strong>
      <dl>
        <div><dt>ID</dt><dd className="mono">{r.id}</dd></div>
        <div><dt>Designation</dt><dd>{r.designation}</dd></div>
        <div><dt>Sector</dt><dd>{r.sector}</dd></div>
        <div><dt>Mobile</dt><dd>{formatMobile(r.mobile)}</dd></div>
        <div><dt>{ok ? 'Time' : 'First check-in'}</dt><dd>{r.checkInTime}</dd></div>
      </dl>
    </div>
  )
}

let audioCtx
function beep(freq) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(0.15, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25)
    o.connect(g).connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + 0.25)
  } catch {
    /* sound is optional */
  }
}
