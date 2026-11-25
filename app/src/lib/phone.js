// UAE mobile numbers: +971 5X XXX XXXX, where 5X is 50, 52, 54, 55, 56 or 58.
const UAE_MOBILE = /^9715[024568]\d{7}$/

/** Turns any common way of typing a UAE mobile into "9715XXXXXXXX" (digits only). */
export function normalizeMobile(input) {
  let d = String(input || '').replace(/\D/g, '')
  if (d.startsWith('00971')) d = d.slice(2)
  else if (d.startsWith('0') && d.length === 10) d = '971' + d.slice(1)
  else if (d.length === 9 && d.startsWith('5')) d = '971' + d
  return d
}

export function isValidUaeMobile(input) {
  return UAE_MOBILE.test(normalizeMobile(input))
}

/** "971501234567" -> "+971 50 123 4567" */
export function formatMobile(input) {
  const d = normalizeMobile(input)
  if (!UAE_MOBILE.test(d)) return String(input || '')
  return `+971 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
}
