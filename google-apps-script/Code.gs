/**
 * Ajman Zone Youth Convene – Registration & Attendance API
 * ---------------------------------------------------------
 * Paste this file into Extensions > Apps Script of your Google Sheet,
 * then Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * See README.md for the full steps.
 */

// Password the attendance (QR scanner) page asks for. CHANGE THIS.
// You can also set a Script Property named STAFF_KEY, which takes priority.
const STAFF_KEY = 'CHANGE_ME_2026';

const SHEET_NAME = 'Registrations';
const TIMEZONE = 'Asia/Dubai';
const ID_PREFIX = 'AZYC-';

const HEADERS = ['Timestamp', 'Registration ID', 'Name', 'Mobile', 'Email', 'Sector', 'Designation', 'Attended', 'Check-in Time'];
const C = { TS: 0, ID: 1, NAME: 2, MOBILE: 3, EMAIL: 4, SECTOR: 5, DESIG: 6, ATTENDED: 7, CHECKIN: 8 };

const SECTORS = ['KARAMA', 'SANAYA', 'RASHIDIYA', 'NUAIMIYA', 'JURF', 'AL BUSTAN'];
const DESIGNATIONS = ['Zone EB', 'Chairman', 'General Secretary', 'Wisdom Sec', 'Kalalayam Sec', 'Students Sec', 'Organisation Sec', 'Media Sec', 'Finance Sec'];

function doGet() {
  return out({ ok: true, service: 'Ajman Zone Youth Convene API' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // one write at a time, so duplicate checks and IDs stay correct
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'register': return out(register(req));
      case 'retrieve': return out(retrieve(req));
      case 'checkin': requireStaff(req); return out(checkin(req));
      case 'stats': requireStaff(req); return out(stats());
      default: throw fail('Unknown action.', 'BAD_REQUEST');
    }
  } catch (err) {
    return out({ ok: false, code: err.code || 'ERROR', error: err.message || String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- actions ---------------- */

function register(req) {
  const name = clean(req.name);
  const mobile = normalizeMobile(req.mobile);
  const email = clean(req.email).toLowerCase();
  const sector = clean(req.sector);
  const designation = clean(req.designation);

  if (name.length < 2 || name.length > 100) throw fail('Please enter a valid name.', 'INVALID');
  if (!/^9715[024568]\d{7}$/.test(mobile)) throw fail('Only UAE mobile numbers (+971 5X XXX XXXX) are allowed.', 'INVALID');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Please enter a valid email address.', 'INVALID');
  if (SECTORS.indexOf(sector) < 0) throw fail('Please select a valid sector.', 'INVALID');
  if (DESIGNATIONS.indexOf(designation) < 0) throw fail('Please select a valid designation.', 'INVALID');

  const rows = readRows();
  if (rows.some(function (r) { return normalizeMobile(r[C.MOBILE]) === mobile; })) {
    throw fail('This mobile number is already registered.', 'DUPLICATE');
  }

  const ids = {};
  rows.forEach(function (r) { ids[r[C.ID]] = true; });
  let id;
  do { id = ID_PREFIX + randomCode(6); } while (ids[id]);

  const ts = nowText();
  sheet().appendRow([ts, id, safe(name), "'+" + mobile, safe(email), sector, designation, 'NO', '']);

  return { ok: true, record: toRecord([ts, id, name, mobile, email, sector, designation, 'NO', '']) };
}

function retrieve(req) {
  const mobile = normalizeMobile(req.mobile);
  const email = clean(req.email).toLowerCase();
  const row = readRows().filter(function (r) {
    return normalizeMobile(r[C.MOBILE]) === mobile && String(r[C.EMAIL]).toLowerCase() === email;
  })[0];
  if (!row) throw fail('No registration found for this mobile number and email.', 'NOT_FOUND');
  return { ok: true, record: toRecord(row) };
}

function checkin(req) {
  const id = clean(req.id).toUpperCase();
  const rows = readRows();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][C.ID] !== id) continue;
    if (rows[i][C.ATTENDED] === 'YES') return { ok: true, status: 'ALREADY', record: toRecord(rows[i]) };
    const ts = nowText();
    sheet().getRange(i + 2, C.ATTENDED + 1, 1, 2).setValues([['YES', ts]]);
    rows[i][C.ATTENDED] = 'YES';
    rows[i][C.CHECKIN] = ts;
    return { ok: true, status: 'CHECKED_IN', record: toRecord(rows[i]) };
  }
  throw fail('No registration found for "' + id + '".', 'NOT_FOUND');
}

function stats() {
  const rows = readRows();
  return {
    ok: true,
    total: rows.length,
    attended: rows.filter(function (r) { return r[C.ATTENDED] === 'YES'; }).length,
  };
}

/* ---------------- helpers ---------------- */

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#01103f').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows() {
  const sh = sheet();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues();
}

function toRecord(r) {
  return {
    timestamp: r[C.TS],
    id: r[C.ID],
    name: r[C.NAME],
    mobile: normalizeMobile(r[C.MOBILE]),
    email: r[C.EMAIL],
    sector: r[C.SECTOR],
    designation: r[C.DESIG],
    attended: r[C.ATTENDED] === 'YES',
    checkInTime: r[C.CHECKIN],
  };
}

function requireStaff(req) {
  const key = PropertiesService.getScriptProperties().getProperty('STAFF_KEY') || STAFF_KEY;
  if (String(req.key || '') !== key) throw fail('Incorrect staff password.', 'UNAUTHORIZED');
}

function normalizeMobile(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.indexOf('00971') === 0) d = d.slice(2);
  else if (d.charAt(0) === '0' && d.length === 10) d = '971' + d.slice(1);
  else if (d.length === 9 && d.charAt(0) === '5') d = '971' + d;
  return d;
}

function randomCode(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let s = '';
  for (let i = 0; i < n; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function clean(v) { return String(v == null ? '' : v).trim(); }
// Stops user input from being treated as a spreadsheet formula.
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function nowText() { return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }
function fail(message, code) { const e = new Error(message); e.code = code; return e; }
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
