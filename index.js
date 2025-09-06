module.exports = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    
    // Simple RSS feed for testing
    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NCA News Feed</title>
    <link>https://nca.gov.sa/en/news</link>
    <description>Automated RSS feed from NCA</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <item>
      <title>Test Article</title>
      <link>https://nca.gov.sa/en/news</link>
      <description>This is a test RSS feed</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;

    res.send(rssFeed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};