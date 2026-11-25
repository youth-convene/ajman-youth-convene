import { useState } from 'react'
import { api } from '../lib/api'
import { DESIGNATIONS, SECTORS } from '../lib/constants'
import { isValidUaeMobile, normalizeMobile } from '../lib/phone'
import PassBuilder from '../components/PassBuilder'

const EMPTY = { name: '', mobile: '', email: '', sector: '', designation: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(f) {
  const e = {}
  if (f.name.trim().length < 2) e.name = 'Please enter your full name.'
  if (!f.mobile.trim()) e.mobile = 'Mobile number is required.'
  else if (!isValidUaeMobile(f.mobile)) e.mobile = 'Enter a UAE mobile number, e.g. 050 123 4567.'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.'
  if (!f.sector) e.sector = 'Select your sector.'
  if (!f.designation) e.designation = 'Select your designation.'
  return e
}

export default function Register() {
  const [mode, setMode] = useState('form') // form | retrieve | pass
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(EMPTY)

  if (mode === 'pass' && record) {
    return (
      <PassBuilder
        record={record}
        onDone={() => {
          setRecord(null)
          setForm(EMPTY)
          setMode('form')
        }}
      />
    )
  }

  const showPass = (r) => {
    setRecord(r)
    setMode('pass')
  }

  return mode === 'retrieve' ? (
    <RetrieveForm initialMobile={form.mobile} onFound={showPass} onBack={() => setMode('form')} />
  ) : (
    <RegisterForm form={form} setForm={setForm} onRegistered={showPass} onRetrieve={() => setMode('retrieve')} />
  )
}

function RegisterForm({ form, setForm, onRegistered, onRetrieve }) {
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (ev) => {
    setForm({ ...form, [key]: ev.target.value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  async function submit(ev) {
    ev.preventDefault()
    const e = validate(form)
    setErrors(e)
    setServerError(null)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const { record } = await api.register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: normalizeMobile(form.mobile),
      })
      onRegistered(record)
    } catch (err) {
      setServerError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <p className="eyebrow">Step 1 of 2</p>
        <h1>Delegate Registration</h1>
        <p className="sub">Register once to receive your personal QR entry pass.</p>
      </div>

      <form onSubmit={submit} noValidate className="form">
        <Field label="Full Name" error={errors.name}>
          <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your full name" maxLength={100} />
        </Field>

        <Field label="Mobile Number" error={errors.mobile} hint="UAE numbers only">
          <div className="prefixed">
            <span className="prefix">+971</span>
            <input
              value={form.mobile}
              onChange={set('mobile')}
              inputMode="tel"
              autoComplete="tel"
              placeholder="50 123 4567"
              maxLength={16}
            />
          </div>
        </Field>

        <Field label="Email ID" error={errors.email}>
          <input value={form.email} onChange={set('email')} type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>

        <div className="row-2">
          <Field label="Sector" error={errors.sector}>
            <select value={form.sector} onChange={set('sector')}>
              <option value="" disabled>
                Select sector
              </option>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Designation" error={errors.designation}>
            <select value={form.designation} onChange={set('designation')}>
              <option value="" disabled>
                Select designation
              </option>
              {DESIGNATIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>

        {serverError && (
          <div className="alert alert-error" role="alert">
            {serverError.message}
            {serverError.code === 'DUPLICATE' && (
              <button type="button" className="link-btn" onClick={onRetrieve}>
                Get my existing pass →
              </button>
            )}
          </div>
        )}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Register'}
        </button>
      </form>

      <p className="aside">
        Already registered?{' '}
        <button type="button" className="link-btn" onClick={onRetrieve}>
          Download your pass again
        </button>
      </p>
    </section>
  )
}

function RetrieveForm({ initialMobile, onFound, onBack }) {
  const [mobile, setMobile] = useState(initialMobile)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(ev) {
    ev.preventDefault()
    if (!isValidUaeMobile(mobile)) return setError('Enter the UAE mobile number you registered with.')
    if (!EMAIL_RE.test(email.trim())) return setError('Enter the email address you registered with.')
    setError('')
    setBusy(true)
    try {
      const { record } = await api.retrieve(normalizeMobile(mobile), email.trim())
      onFound(record)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <p className="eyebrow">Already registered</p>
        <h1>Get Your Pass</h1>
        <p className="sub">Enter the mobile number and email you registered with.</p>
      </div>
      <form onSubmit={submit} noValidate className="form">
        <Field label="Mobile Number">
          <div className="prefixed">
            <span className="prefix">+971</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="50 123 4567" />
          </div>
        </Field>
        <Field label="Email ID">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
        </Field>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Find my registration'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to registration
        </button>
      </form>
    </section>
  )
}

function Field({ label, error, hint, children }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
