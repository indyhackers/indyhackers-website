/// <reference path="../pb_data/types.d.ts" />

// Seed the tech topics used to tag and filter events. Ported from the Rails
// db/seeds.rb. Re-runnable: topics are upserted by slug and keyword lists are
// refreshed on each run. `kind` groups topics in the UI.
migrate(
  (app) => {
    const TOPICS = [
      // Programming languages
      { name: 'Ruby', kind: 'language', color: '#cc342d', keywords: ['ruby', 'rails'] },
      { name: 'Python', kind: 'language', color: '#3776ab', keywords: ['python', 'django', 'flask'] },
      { name: 'JavaScript', kind: 'language', color: '#f7df1e', keywords: ['javascript', 'js', 'node', 'node.js', 'typescript', 'ts', 'react', 'vue', 'angular'] },
      { name: 'Go', kind: 'language', color: '#00add8', keywords: ['go', 'golang'] },
      { name: 'Rust', kind: 'language', color: '#dea584', keywords: ['rust'] },
      { name: 'Java', kind: 'language', color: '#b07219', keywords: ['java', 'jvm', 'kotlin', 'spring'] },
      { name: 'C#/.NET', kind: 'language', color: '#512bd4', keywords: ['c#', 'csharp', '.net', 'dotnet'] },
      { name: 'PHP', kind: 'language', color: '#777bb4', keywords: ['php', 'laravel'] },
      { name: 'Swift', kind: 'language', color: '#f05138', keywords: ['swift', 'ios'] },
      { name: 'Elixir', kind: 'language', color: '#6e4a7e', keywords: ['elixir', 'phoenix', 'erlang'] },
      // Areas / disciplines
      { name: 'AI/ML', kind: 'area', color: '#10a37f', keywords: ['ai', 'ml', 'machine learning', 'artificial intelligence', 'llm', 'deep learning', 'genai'] },
      { name: 'Data', kind: 'area', color: '#e0245e', keywords: ['data', 'data science', 'analytics', 'sql', 'postgres', 'database'] },
      { name: 'DevOps', kind: 'area', color: '#326ce5', keywords: ['devops', 'kubernetes', 'docker', 'terraform', 'ci/cd', 'platform engineering'] },
      { name: 'Cloud', kind: 'area', color: '#ff9900', keywords: ['cloud', 'aws', 'azure', 'gcp', 'serverless'] },
      { name: 'Security', kind: 'area', color: '#1f2937', keywords: ['security', 'infosec', 'cybersecurity', 'owasp', 'pentest'] },
      { name: 'Web', kind: 'area', color: '#2563eb', keywords: ['web', 'frontend', 'front-end', 'css', 'html', 'fullstack'] },
      { name: 'Mobile', kind: 'area', color: '#34d399', keywords: ['mobile', 'android', 'ios', 'flutter', 'react native'] },
      { name: 'Startup', kind: 'area', color: '#7c3aed', keywords: ['startup', 'founder', 'entrepreneur', 'indie', 'bootstrap'] },
      { name: 'Design/UX', kind: 'area', color: '#ec4899', keywords: ['design', 'ux', 'ui', 'product design', 'figma'] }
    ]

    // Rails String#parameterize: lowercase, non-alphanumerics -> single dash,
    // trim leading/trailing dashes. "C#/.NET" -> "c-net", "AI/ML" -> "ai-ml".
    const slugify = (name) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const collection = app.findCollectionByNameOrId('topics')

    TOPICS.forEach((attrs) => {
      const slug = slugify(attrs.name)
      let record
      try {
        record = app.findFirstRecordByData('topics', 'slug', slug)
      } catch (_) {
        record = new Record(collection)
      }
      record.set('name', attrs.name)
      record.set('slug', slug)
      record.set('kind', attrs.kind)
      record.set('color', attrs.color)
      record.set('keywords', attrs.keywords)
      app.save(record)
    })
  },
  (app) => {
    // Down: remove the seeded topics.
    const records = app.findAllRecords('topics')
    records.forEach((r) => app.delete(r))
  }
)
