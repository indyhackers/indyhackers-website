/// <reference path="../pb_data/types.d.ts" />

// Recurrence rule for an event series, so the calendar can label a collapsed
// series "Every Tuesday" / "Every 3rd Wednesday" instead of listing every
// occurrence.
//
// The sync asks Google for `singleEvents=true`, which expands a recurring event
// into individual instances and drops the RRULE — the rule only exists on the
// master event. calendar_sync.js now fetches that master once per series and
// stores its `recurrence` array here verbatim (e.g.
// ["RRULE:FREQ=MONTHLY;BYDAY=3WE"]), including any EXDATE/RDATE lines Google
// returns alongside it.
//
// Existing series rows stay empty until the next sync backfills them; the UI
// falls back to a plain "Recurring" badge until then.
migrate(
  (app) => {
    const series = app.findCollectionByNameOrId('event_series')

    series.fields.push(
      new JSONField({
        id: 'json_recurrence',
        name: 'recurrence',
        required: false,
        maxSize: 20000
      })
    )

    app.save(series)
  },
  (app) => {
    const series = app.findCollectionByNameOrId('event_series')
    series.fields.removeById('json_recurrence')
    app.save(series)
  }
)
