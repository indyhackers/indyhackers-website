// Dev-only helpers for the apply-mocks / export-mocks console commands.
// Updated for the PocketBase v0.23+ API ($app.* instead of the removed
// $app.dao()). These run only when the commands are invoked, not at startup.

function exportMocks() {
  try {
    const snapshot = {}

    const collections = $app.findAllCollections('base', 'auth', 'view')

    for (const collection of collections) {
      const schema = $app.findCollectionByNameOrId(collection.name)
      const records = $app.findAllRecords(collection.name)

      snapshot[collection.name] = {
        collection: schema,
        items: records.map((record) => record.publicExport())
      }
    }

    console.log(`Writing ${__hooks}/mocks.json`)
    $os.writeFile(`${__hooks}/mocks.json`, JSON.stringify(snapshot, null, 2), 0o644)
  } catch (error) {
    console.error('Error exporting mocks:', error)
  }
}

function applyMocks() {
  try {
    const mockData = JSON.parse(String.fromCharCode(...$os.readFile(`${__hooks}/mocks.json`)))

    for (const [collectionName, collectionData] of Object.entries(mockData)) {
      // Find or create the collection.
      let collection = null
      try {
        collection = $app.findCollectionByNameOrId(collectionName)
      } catch (err) {
        console.log(`Creating collection: ${collectionName}`)
        collection = new Collection(collectionData.collection)
        $app.save(collection)
      }

      // Insert any records that don't already exist.
      for (const item of collectionData.items) {
        try {
          $app.findRecordById(collectionName, item.id)
        } catch (err) {
          console.log(`Inserting record ${item.id} into ${collectionName}`)
          const record = new Record(collection, item)
          if (collection.type === 'auth') {
            record.setPassword($security.randomString(42))
          }
          $app.save(record)
        }
      }
    }
  } catch (error) {
    console.log(error)
  }
}

module.exports = {
  applyMocks,
  exportMocks
}
