/// <reference path="../pb_data/types.d.ts" />

// Cover image for events. The grid view on /calendar leads with a picture per
// event (meetup.com-style), so organizers need somewhere to put one.
//
// Optional and unprotected by events_guard.pb.js: an event's owner (or the
// board) sets it like any other editable detail. Events without one — every
// Google-synced event, since the calendar sync has no image to give — fall back
// to a generated cover in the UI.
//
// Thumbs are 16:9 so the card crop is done server-side rather than by shipping
// a full-size photo to every card.
migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('events')

    events.fields.push(
      new FileField({
        id: 'file_image',
        name: 'image',
        required: false,
        maxSelect: 1,
        maxSize: 5242880, // 5 MB
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        thumbs: ['640x360f', '1280x720f']
      })
    )

    app.save(events)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.fields.removeById('file_image')
    app.save(events)
  }
)
