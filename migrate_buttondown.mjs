import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

const ADMIN_EMAIL = 'brook2022nets@gmail.com';
const ADMIN_PASS = 'Bn@0907587665';
const RSS_URL = 'https://buttondown.com/indyhackers/rss';

async function runMigration() {
  console.log('Authenticating with PocketBase...');
  await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

  console.log(`Fetching RSS feed from ${RSS_URL}...`);
  const response = await fetch(RSS_URL);
  const xmlText = await response.text();

  const items = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];
  console.log(`Found ${items.length} items to import.`);

  for (const itemXml of items) {
    const getTag = (tag) => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
    };

    const title = getTag('title');
    const link = getTag('link');
    const pubDateStr = getTag('pubDate');
    const rawContent = getTag('content:encoded') || getTag('description');

    const slug = link.includes('/archive/')
      ? link.split('/archive/')[1].split('/')[0].trim()
      : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const plainText = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const excerpt = plainText.length > 200 ? plainText.slice(0, 197) + '...' : plainText;
    const publishedAt = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    const recordData = {
      title,
      slug,
      content: rawContent,
      excerpt,
      published_at: publishedAt,
      featured: false,
      link: link
    };

    try {
      const existing = await pb.collection('newsletters').getFirstListItem(`slug="${slug}"`).catch(() => null);

      if (existing) {
        console.log(`[SKIP] Already exists: ${slug}`);
      } else {
        await pb.collection('newsletters').create(recordData);
        console.log(`[IMPORTED] ${title} (${slug})`);
      }
    } catch (err) {
      console.error(`[ERROR] Failed to import: ${title}`, err?.data || err?.message);
    }
  }

  console.log('Migration complete!');
}

runMigration();
