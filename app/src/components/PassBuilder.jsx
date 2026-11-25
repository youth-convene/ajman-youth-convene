import { useEffect, useRef, useState } from 'react'
import { loadFile, renderPass } from '../lib/passCanvas'
import { formatMobile } from '../lib/phone'

export default function PassBuilder({ record, onDone }) {
  const [passUrl, setPassUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  useEffect(() => () => passUrl && URL.revokeObjectURL(passUrl), [passUrl])

  async function onPick(ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please choose an image file (JPG or PNG).')
    setError('')
    setBusy(true)
    try {
      const photo = await loadFile(file)
      const canvas = await renderPass(record, photo)
      URL.revokeObjectURL(photo.src)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
      setPassUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err.message || 'Could not create the pass. Please try another photo.')
    } finally {
      setBusy(false)
    }
  }

  const fileName = `AZYC-Pass-${record.id}.png`

  return (
    <section className="card">
      <div className="success-strip">
        <span className="check" aria-hidden="true">✓</span>
        <div>
          <strong>You're registered, {record.name.split(' ')[0]}!</strong>
          <span>
            Registration ID <b className="mono">{record.id}</b>
          </span>
        </div>
      </div>

      <div className="card-head">
        <p className="eyebrow">Step 2 of 2</p>
        <h1>Create Your Pass</h1>
        <p className="sub">Upload a clear photo of yourself. We'll place it on the official frame with your QR code.</p>
      </div>

      <dl className="summary">
        <div><dt>Name</dt><dd>{record.name}</dd></div>
        <div><dt>Mobile</dt><dd>{formatMobile(record.mobile)}</dd></div>
        <div><dt>Sector</dt><dd>{record.sector}</dd></div>
        <div><dt>Designation</dt><dd>{record.designation}</dd></div>
      </dl>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

      {passUrl ? (
        <div className="pass-result">
          <img src={passUrl} alt="Your Youth Convene pass" className="pass-preview" />
          <a className="btn btn-primary" href={passUrl} download={fileName}>
            ⬇ Download Pass
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Use a different photo'}
          </button>
          <p className="aside">Show the QR code on this pass at the entrance for attendance.</p>
        </div>
      ) : (
        <button type="button" className="dropzone" onClick={() => fileRef.current.click()} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" />
              <span>Creating your pass…</span>
            </>
          ) : (
            <>
              <span className="dz-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <strong>Upload your photo</strong>
              <span>JPG or PNG · a portrait photo works best</span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <button type="button" className="link-btn center" onClick={onDone}>
        Register another delegate
      </button>
    </section>
  )
}
