import { describe, it, expect } from 'vitest'
import { recurrenceLabel, eventScheduleLabel } from '@/recurrence'

// An occurrence that falls on Wednesday, 15 July 2026 — used wherever a rule
// leaves its weekday or day-of-month implicit. Noon local keeps the date stable
// regardless of the runner's timezone.
const WED_JUL_15 = new Date(2026, 6, 15, 12)

describe('recurrenceLabel', () => {
  it('returns nothing without a rule', () => {
    expect(recurrenceLabel(null)).toBe('')
    expect(recurrenceLabel([])).toBe('')
    expect(recurrenceLabel(undefined)).toBe('')
    expect(recurrenceLabel('')).toBe('')
  })

  it('ignores non-RRULE lines in the recurrence array', () => {
    expect(recurrenceLabel(['EXDATE;TZID=America/Indiana/Indianapolis:20260715T180000'])).toBe('')
    expect(
      recurrenceLabel([
        'RRULE:FREQ=WEEKLY;BYDAY=TU',
        'EXDATE;TZID=America/Indiana/Indianapolis:20260721T180000'
      ])
    ).toBe('Every Tuesday')
  })

  it('accepts a bare rule string as well as an array', () => {
    expect(recurrenceLabel('RRULE:FREQ=WEEKLY;BYDAY=TU')).toBe('Every Tuesday')
  })

  describe('weekly', () => {
    it('names the day', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=TU'])).toBe('Every Tuesday')
    })

    it('calls an interval of 2 "every other"', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU'])).toBe('Every other Tuesday')
    })

    it('spells out longer intervals', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;INTERVAL=3;BYDAY=TU'])).toBe(
        'Every 3 weeks on Tuesday'
      )
    })

    it('lists multiple days', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=TU,TH'])).toBe('Every Tuesday and Thursday')
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'])).toBe(
        'Every Monday, Wednesday, and Friday'
      )
    })

    it('falls back to the occurrence weekday when BYDAY is absent', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY'], WED_JUL_15)).toBe('Every Wednesday')
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY'])).toBe('Every week')
    })
  })

  describe('monthly', () => {
    it('describes a positional weekday', () => {
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYDAY=3WE'])).toBe('Every 3rd Wednesday')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYDAY=1MO'])).toBe('Every 1st Monday')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYDAY=2TU'])).toBe('Every 2nd Tuesday')
    })

    it('reads a negative ordinal as "last"', () => {
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYDAY=-1FR'])).toBe('Every last Friday')
    })

    it('describes a day of the month', () => {
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYMONTHDAY=15'])).toBe('Monthly on the 15th')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYMONTHDAY=1'])).toBe('Monthly on the 1st')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYMONTHDAY=22'])).toBe('Monthly on the 22nd')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYMONTHDAY=11'])).toBe('Monthly on the 11th')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;BYMONTHDAY=-1'])).toBe('Monthly on the last day')
    })

    it('falls back to the occurrence date when the rule says only FREQ', () => {
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY'], WED_JUL_15)).toBe('Monthly on the 15th')
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY'])).toBe('Every month')
    })

    it('handles intervals', () => {
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;INTERVAL=2;BYDAY=3WE'])).toBe(
        'Every other 3rd Wednesday'
      )
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;INTERVAL=3;BYDAY=3WE'])).toBe(
        'Every 3 months on the 3rd Wednesday'
      )
      expect(recurrenceLabel(['RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15'])).toBe(
        'Every other month on the 15th'
      )
    })
  })

  describe('daily and yearly', () => {
    it('describes daily rules', () => {
      expect(recurrenceLabel(['RRULE:FREQ=DAILY'])).toBe('Every day')
      expect(recurrenceLabel(['RRULE:FREQ=DAILY;INTERVAL=2'])).toBe('Every other day')
      expect(recurrenceLabel(['RRULE:FREQ=DAILY;INTERVAL=5'])).toBe('Every 5 days')
    })

    it('describes yearly rules', () => {
      expect(recurrenceLabel(['RRULE:FREQ=YEARLY;BYMONTH=7;BYMONTHDAY=15'])).toBe(
        'Every year on July 15'
      )
      expect(recurrenceLabel(['RRULE:FREQ=YEARLY'], WED_JUL_15)).toBe('Every year on July 15')
      expect(recurrenceLabel(['RRULE:FREQ=YEARLY'])).toBe('Every year')
    })
  })

  describe('malformed input', () => {
    it('ignores a rule with no FREQ', () => {
      expect(recurrenceLabel(['RRULE:BYDAY=TU'])).toBe('')
    })

    it('ignores frequencies it cannot phrase', () => {
      expect(recurrenceLabel(['RRULE:FREQ=HOURLY'])).toBe('')
      expect(recurrenceLabel(['RRULE:FREQ=SECONDLY'])).toBe('')
    })

    it('treats a bad INTERVAL as 1', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;INTERVAL=abc;BYDAY=TU'])).toBe('Every Tuesday')
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;INTERVAL=0;BYDAY=TU'])).toBe('Every Tuesday')
    })

    it('skips unparseable BYDAY entries', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=XX'], WED_JUL_15)).toBe('Every Wednesday')
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=XX,TU'])).toBe('Every Tuesday')
    })

    it('ignores COUNT and UNTIL rather than mangling the phrase', () => {
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=TU;COUNT=10'])).toBe('Every Tuesday')
      expect(recurrenceLabel(['RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261231T000000Z'])).toBe(
        'Every Tuesday'
      )
    })
  })
})

describe('eventScheduleLabel', () => {
  const series = (recurrence) => ({
    seriesId: 'ser_1',
    series: { id: 'ser_1', title: 'Meetup', recurrence },
    start: '2026-07-15T18:00:00.000-04:00'
  })

  // Local wall-clock times, so the assertions hold wherever the runner sits.
  const at = (hours, minutes = 0, extra = {}) => ({
    seriesId: 'ser_1',
    series: { id: 'ser_1', recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=SU'] },
    start: new Date(2026, 6, 12, hours, minutes),
    ...extra
  })

  it('describes the cadence of a recurring event', () => {
    expect(eventScheduleLabel(series(['RRULE:FREQ=MONTHLY;BYDAY=3WE']))).toBe('Every 3rd Wednesday')
  })

  it('falls back to "Recurring" when the rule has not been synced yet', () => {
    expect(eventScheduleLabel(series(null))).toBe('Recurring')
    expect(eventScheduleLabel({ seriesId: 'ser_1', series: null, start: '2026-07-15' })).toBe(
      'Recurring'
    )
    // An unparseable rule is no better than none.
    expect(eventScheduleLabel(series(['RRULE:FREQ=HOURLY']))).toBe('Recurring')
  })

  it('returns nothing for a one-off event, so the caller shows its date', () => {
    expect(eventScheduleLabel({ seriesId: '', series: null, start: '2026-07-15' })).toBe('')
    expect(eventScheduleLabel(null)).toBe('')
    expect(eventScheduleLabel(undefined)).toBe('')
  })

  describe('withTime', () => {
    it('appends the start time to the cadence', () => {
      expect(eventScheduleLabel(at(10), { withTime: true })).toBe('Every Sunday at 10am')
    })

    it('includes minutes only when there are any', () => {
      expect(eventScheduleLabel(at(10, 30), { withTime: true })).toBe('Every Sunday at 10:30am')
      expect(eventScheduleLabel(at(18), { withTime: true })).toBe('Every Sunday at 6pm')
      expect(eventScheduleLabel(at(18, 5), { withTime: true })).toBe('Every Sunday at 6:05pm')
    })

    it('renders midnight and noon as 12, not 0', () => {
      expect(eventScheduleLabel(at(0), { withTime: true })).toBe('Every Sunday at 12am')
      expect(eventScheduleLabel(at(12), { withTime: true })).toBe('Every Sunday at 12pm')
    })

    it('leaves an all-day event without a time', () => {
      expect(eventScheduleLabel(at(0, 0, { isAllDay: true }), { withTime: true })).toBe(
        'Every Sunday'
      )
    })

    it('omits the time when the occurrence date is unusable', () => {
      expect(eventScheduleLabel({ ...at(10), start: 'not a date' }, { withTime: true })).toBe(
        'Every Sunday'
      )
    })

    it('is off by default, for surfaces that show a date as well', () => {
      expect(eventScheduleLabel(at(10))).toBe('Every Sunday')
      expect(eventScheduleLabel(at(10), {})).toBe('Every Sunday')
    })

    it('still times a rule that fell back to "Recurring"', () => {
      const noRule = { ...at(10), series: { id: 'ser_1', recurrence: null } }
      expect(eventScheduleLabel(noRule, { withTime: true })).toBe('Recurring at 10am')
    })
  })
})
