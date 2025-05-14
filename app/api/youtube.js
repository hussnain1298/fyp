// pages/api/youtube-videos.js
import axios from 'axios';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // API Key from environment variables
const CHANNEL_ID = process.env.CHANNEL_ID; // Channel ID from environment variables

export default async (req, res) => {
  try {
    const { query } = req.query; // Search query for YouTube, e.g. "Web Development"
    
    // Check if the query exists, if not, return an error
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Make the API request to fetch YouTube search results based on the query
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',     // We want video snippet data
        channelId: CHANNEL_ID,  // Using channelId to restrict results to a specific channel
        q: query,            // Search query from request parameter
        maxResults: 5,       // Limit results to 5 videos (can be adjusted)
        key: YOUTUBE_API_KEY,   // API Key from environment
      },
    });

    // Check if response contains data
    if (response.data && response.data.items) {
      // Return video data to client
      return res.status(200).json(response.data.items);
    } else {
      // If no items in response
      return res.status(404).json({ error: 'No videos found' });
    }
  } catch (error) {
    // Log error and return 500 status code if something goes wrong
    console.error('Error fetching YouTube videos:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
