const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/rss', async (req, res) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://nca.gov.sa/en/news', { waitUntil: 'networkidle2' });

  const items = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.card-body'));
    return nodes.map(node => {
      const title = node.querySelector('h3')?.innerText.trim();
      const link = node.querySelector('a')?.href;
      const desc = node.querySelector('p')?.innerText.trim();
      return { title, link, desc };
    });
  });

  await browser.close();

  const rssItems = items.map(item => `
    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <description>${item.desc}</description>
    </item>
  `).join('\n');

  const rssFeed = `
    <rss version="2.0">
      <channel>
        <title>NCA News Feed</title>
        <link>https://nca.gov.sa/en/news</link>
        <description>Automated feed from NCA</description>
        ${rssItems}
      </channel>
    </rss>
  `;

  res.set('Content-Type', 'application/rss+xml');
  res.send(rssFeed.trim());
});

app.listen(PORT, () => {
  console.log(`RSS Feed running at http://localhost:${PORT}/rss`);
});
