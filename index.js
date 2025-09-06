const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to generate GUID
function generateGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

app.get('/rss', async (req, res) => {
  let browser;
  
  try {
    console.log('Starting to scrape NCA news...');
    
    // Launch browser with proper configuration
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to the page with timeout
    await page.goto('https://nca.gov.sa/en/news', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForSelector('.card-body', { timeout: 10000 });

    const items = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.card-body'));
      return nodes.map((node, index) => {
        const title = node.querySelector('h3')?.innerText?.trim();
        const linkElement = node.querySelector('a');
        const link = linkElement?.href;
        const desc = node.querySelector('p')?.innerText?.trim();
        
        // Only return items with valid data
        if (title && link) {
          return { 
            title, 
            link: link.startsWith('http') ? link : `https://nca.gov.sa${link}`,
            desc: desc || 'No description available',
            pubDate: new Date().toUTCString(),
            guid: `nca-${index}-${Date.now()}`
          };
        }
        return null;
      }).filter(item => item !== null);
    });

    console.log(`Found ${items.length} news items`);

    // Generate RSS items
    const rssItems = items.map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.desc)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
    </item>`).join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NCA News Feed</title>
    <link>https://nca.gov.sa/en/news</link>
    <description>Automated RSS feed from National Cybersecurity Authority (NCA) Saudi Arabia</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="http://localhost:${PORT}/rss" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(rssFeed);
    
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).json({ 
      error: 'Failed to generate RSS feed', 
      message: error.message 
    });
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
    }
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'NCA RSS Generator is running',
    rss_feed: `http://localhost:${PORT}/rss`,
    status: 'healthy'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`NCA RSS Generator running on http://localhost:${PORT}`);
  console.log(`RSS feed available at http://localhost:${PORT}/rss`);
});

module.exports = app;