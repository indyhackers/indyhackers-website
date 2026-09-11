/// <reference path="../pb_data/types.d.ts" />

// Topics tag and group events. Ported from the Rails `topics` table.
// `kind` groups them in the UI: language | framework | area.
migrate(
  (app) => {
    const topics = new Collection({
      type: 'base',
      name: 'topics',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        {
          name: 'kind',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['language', 'framework', 'area']
        },
        { name: 'color', type: 'text', required: false },
        // keyword list used by the sync hook for auto-tagging
        { name: 'keywords', type: 'json', required: false, maxSize: 2000000 }
      ],
      indexes: ['CREATE UNIQUE INDEX idx_topics_slug ON topics (slug)']
    })

    app.save(topics)

    // Public read; writes happen server-side (sync hook) or via admin.
    topics.listRule = ''
    topics.viewRule = ''
    topics.createRule = null
    topics.updateRule = null
    topics.deleteRule = null
    app.save(topics)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('topics'))
  }
)
