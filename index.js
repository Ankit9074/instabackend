const express = require('express');
const compression = require('compression');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

// Middleware
app.use(compression());
app.use(cors({
  methods: ["POST", "GET"],
  credentials: true
}));
app.use(express.static('public'));

// Scraping Route
app.get('/scrape', async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const profileData = await getProfileData(username);
    res.json(profileData);
  } catch (error) {
    console.error(`Error fetching data for ${username}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch Instagram data' });
  }
});

// Function to scrape Instagram profile data
async function getProfileData(username) {
  const url = `https://www.instagram.com/${username}/`;
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const $ = cheerio.load(data);

    // Extract profile image
    const profileImage = $('meta[property="og:image"]').attr('content');

    // Extract followers count and full name
    let followers = null;
    let fullName = null;

    const scriptTags = $('script[type="text/javascript"]').toArray();
    scriptTags.forEach((script) => {
      const content = $(script).html();
      if (content && content.includes('edge_followed_by')) {
        const followersMatch = content.match(/"edge_followed_by":\{"count":(\d+)\}/);
        if (followersMatch) followers = parseInt(followersMatch[1], 10);

        const nameMatch = content.match(/"full_name":"(.*?)"/);
        if (nameMatch) fullName = nameMatch[1];
      }
    });

    return {
      profileImage: profileImage || null,
      followers: followers || null,
      fullName: fullName || username
    };
  } catch (error) {
    throw new Error('Error scraping profile data');
  }
}

// Export the app for Vercel
module.exports = app;

// Run server locally (for testing)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}
