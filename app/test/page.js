"use client";
// pages/index.js
import { useState } from 'react';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [query, setQuery] = useState('');

  const fetchVideos = async () => {
    if (!query) return;  // Avoid empty queries

    const res = await fetch(`/api/youtube?query=${query}`);
    const data = await res.json();
    setVideos(data);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Search YouTube Videos</h1>
      
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-4 p-2 border border-gray-300"
      />
      
      <button
        onClick={fetchVideos}
        className="mt-4 p-2 bg-blue-500 text-white"
      >
        Search
      </button>

      <div className="mt-6">
        {videos.map((video) => (
          <div key={video.id.videoId} className="mb-4">
            <h3 className="text-xl font-semibold">{video.snippet.title}</h3>
            <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`} target="_blank" rel="noopener noreferrer">
              <img
                src={video.snippet.thumbnails.high.url}
                alt={video.snippet.title}
                className="mt-2"
              />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
