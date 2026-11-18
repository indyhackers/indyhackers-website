// Turns a Google Calendar RRULE into the short phrase the calendar shows on a
// collapsed series ("Every Tuesday", "Every 3rd Wednesday").
//
// The rule arrives as the `recurrence` array Google returns on the master event
// (stored on event_series by calendar_sync.js). That array can also hold
// EXDATE/RDATE/EXRULE lines, so the RRULE is picked out by prefix.
//
// Only the parts that change the phrasing are read: FREQ, INTERVAL, BYDAY,
// BYMONTHDAY and BYMONTH. COUNT and UNTIL bound the series but don't describe
// its cadence, so they're deliberately ignored — the tile has room for the
// shape of the schedule, not its end date.

const DAY_NAMES = {
  SU: 'Sunday',
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday'
}

// Sunday-first, matching JS getDay().
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' }

function ordinal(n) {
  if (n < 0) return 'last'
  return ORDINALS[n] || `${n}th`
}

// "15" -> "15th". Used for monthly-by-date rules.
function dayOfMonth(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'
  return `${n}${suffix}`
}

// "Tuesday and Thursday", "Monday, Wednesday, and Friday".
function joinDays(names) {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

// Splits "RRULE:FREQ=WEEKLY;BYDAY=TU" into { FREQ: 'WEEKLY', BYDAY: 'TU' }.
// Accepts the line with or without its RRULE: prefix.
function parseRule(line) {
  const body = String(line).replace(/^RRULE:/i, '')
  const parts = {}
  body.split(';').forEach((pair) => {
    const idx = pair.indexOf('=')
    if (idx === -1) return
    const key = pair.slice(0, idx).trim().toUpperCase()
    const value = pair.slice(idx + 1).trim()
    if (key) parts[key] = value
  })
  return parts
}

// A BYDAY entry is an optional signed ordinal plus a day code: "TU", "3WE",
// "-1FR".
function parseByDay(value) {
  return String(value)
    .split(',')
    .map((entry) => {
      const match = /^([+-]?\d+)?([A-Z]{2})$/i.exec(entry.trim())
      if (!match) return null
      const code = match[2].toUpperCase()
      if (!DAY_NAMES[code]) return null
      return { ordinal: match[1] ? parseInt(match[1], 10) : null, code }
    })
    .filter(Boolean)
}

function weeklyLabel(parts, interval, start) {
  const byDay = parts.BYDAY ? parseByDay(parts.BYDAY) : []
  // No BYDAY means the rule inherits DTSTART's weekday, which we don't store —
  // read it off the occurrence instead.
  const names = byDay.length
    ? byDay.map((d) => DAY_NAMES[d.code])
    : start
      ? [DAY_NAMES[DAY_CODES[start.getDay()]]]
      : []
  if (!names.length) return interval <= 1 ? 'Every week' : `Every ${interval} weeks`

  const days = joinDays(names)
  if (interval <= 1) return `Every ${days}`
  if (interval === 2) return `Every other ${days}`
  return `Every ${interval} weeks on ${days}`
}

function monthlyLabel(parts, interval, start) {
  const byDay = parts.BYDAY ? parseByDay(parts.BYDAY) : []
  const positional = byDay.find((d) => d.ordinal !== null)

  let what
  if (positional) {
    what = `${ordinal(positional.ordinal)} ${DAY_NAMES[positional.code]}`
  } else if (parts.BYMONTHDAY) {
    const day = parseInt(String(parts.BYMONTHDAY).split(',')[0], 10)
    if (!Number.isNaN(day)) {
      what = day < 0 ? 'last day' : dayOfMonth(day)
    }
  } else if (byDay.length) {
    what = joinDays(byDay.map((d) => DAY_NAMES[d.code]))
  } else if (start) {
    // Bare FREQ=MONTHLY repeats on DTSTART's day of the month.
    what = dayOfMonth(start.getDate())
  }

  if (!what) return interval <= 1 ? 'Every month' : `Every ${interval} months`

  // "Every 3rd Wednesday" reads better than "Monthly on the 3rd Wednesday",
  // but a by-date rule needs the "the Nth" framing to not sound like a weekday.
  const byDate = !positional && !byDay.length
  if (interval <= 1) return byDate ? `Monthly on the ${what}` : `Every ${what}`
  if (interval === 2) return byDate ? `Every other month on the ${what}` : `Every other ${what}`
  return `Every ${interval} months on the ${what}`
}

function yearlyLabel(parts, interval, start) {
  const monthIndex = parts.BYMONTH
    ? parseInt(String(parts.BYMONTH).split(',')[0], 10) - 1
    : start
      ? start.getMonth()
      : null
  const day = parts.BYMONTHDAY
    ? parseInt(String(parts.BYMONTHDAY).split(',')[0], 10)
    : start
      ? start.getDate()
      : null

  const when =
    monthIndex !== null && MONTH_NAMES[monthIndex] && day
      ? ` on ${MONTH_NAMES[monthIndex]} ${day}`
      : ''
  if (interval <= 1) return `Every year${when}`
  if (interval === 2) return `Every other year${when}`
  return `Every ${interval} years${when}`
}

/**
 * Describe a recurrence rule in words.
 *
 * @param {string[]|string} recurrence  Google's `recurrence` array (or a single
 *   RRULE line). EXDATE/RDATE/EXRULE lines are ignored.
 * @param {Date|string} [occurrenceStart]  Start of any occurrence in the
 *   series, used to fill in what the rule leaves implicit (a WEEKLY rule with
 *   no BYDAY, a MONTHLY rule with no BYDAY/BYMONTHDAY).
 * @returns {string} e.g. "Every 3rd Wednesday", or '' when the rule is missing
 *   or not one we can phrase.
 */
export function recurrenceLabel(recurrence, occurrenceStart) {
  const lines = Array.isArray(recurrence) ? recurrence : recurrence ? [recurrence] : []
  const rule = lines.map(String).find((line) => /^RRULE[:;]/i.test(line.trim()))
  if (!rule) return ''

  const parts = parseRule(rule.trim())
  const freq = String(parts.FREQ || '').toUpperCase()
  if (!freq) return ''

  const parsedInterval = parseInt(parts.INTERVAL, 10)
  const interval = Number.isNaN(parsedInterval) || parsedInterval < 1 ? 1 : parsedInterval

  let start = null
  if (occurrenceStart) {
    const d = new Date(occurrenceStart)
    if (!Number.isNaN(d.getTime())) start = d
  }

  switch (freq) {
    case 'DAILY':
      if (interval <= 1) return 'Every day'
      if (interval === 2) return 'Every other day'
      return `Every ${interval} days`
    case 'WEEKLY':
      return weeklyLabel(parts, interval, start)
    case 'MONTHLY':
      return monthlyLabel(parts, interval, start)
    case 'YEARLY':
      return yearlyLabel(parts, interval, start)
    default:
      return ''
  }
}

// Start time in the compact form a schedule line wants: "10am", "10:30am".
// Reads the occurrence in the viewer's own timezone, like every other time on
// the site.
function timeOfDay(start) {
  const d = new Date(start)
  if (Number.isNaN(d.getTime())) return ''
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const suffix = hours < 12 ? 'am' : 'pm'
  const hour = hours % 12 === 0 ? 12 : hours % 12
  return minutes ? `${hour}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour}${suffix}`
}

/**
 * The cadence to show for an event that stands in for a whole series.
 *
 * The calendar collapses a recurring series to a single entry, so "Every 3rd
 * Wednesday" tells a reader more than the date of one occurrence. Series synced
 * before their recurrence rule was stored fall back to a plain "Recurring".
 *
 * @param {object} event  A normalized event (see useEvents.normalizeEvent).
 * @param {object} [options]
 * @param {boolean} [options.withTime]  Append "at 10am", taken from the next
 *   occurrence. For surfaces that show the cadence *instead of* a date, not
 *   alongside one — otherwise the time is stated twice. All-day events never
 *   get a time.
 * @returns {string} '' for a one-off event, which should show its date instead.
 */
export function eventScheduleLabel(event, options) {
  if (!event || !event.seriesId) return ''

  const label = recurrenceLabel(event.series && event.series.recurrence, event.start) || 'Recurring'
  if (!options || !options.withTime || event.isAllDay) return label

  const time = timeOfDay(event.start)
  return time ? `${label} at ${time}` : label
}
