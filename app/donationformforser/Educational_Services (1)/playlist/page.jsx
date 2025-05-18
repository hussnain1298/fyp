"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

export default function PlaylistPage() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get("playlistId");
  const title = searchParams.get("title");

  const [videos, setVideos] = useState([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const API_KEY = "AIzaSyATWT4FhJpulgxRVmDFPbnwv4PB00OhAnI"; // Replace with your actual YouTube API key

  const fetchVideos = async (pageToken = "") => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          params: {
            part: "snippet",
            maxResults: 10,
            playlistId: playlistId,
            key: API_KEY,
            pageToken: pageToken,
          },
        }
      );

      const newVideos = response.data.items.map((item) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));

      setVideos((prevVideos) => [...prevVideos, ...newVideos]);
      setNextPageToken(response.data.nextPageToken || "");
      if (!selectedVideoId && newVideos.length > 0) {
        setSelectedVideoId(newVideos[0].videoId); // default selected video
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (playlistId) {
      fetchVideos();
    }
  }, [playlistId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <h1 className="text-3xl font-bold p-6 bg-white shadow">{title}</h1>

      <div className="flex flex-1">
        {/* Video Player Side (Left) */}
        <div className="w-1/2 p-4">
          {selectedVideoId && (
            <div className="w-full h-[70vh] bg-black rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Video Player"
              ></iframe>
            </div>
          )}
        </div>

        {/* Playlist Side (Right) */}
        <div className="w-1/2 p-4 overflow-y-auto max-h-[80vh] space-y-4">
          {videos.map((video, index) => (
            <div
              key={index}
              className={`flex gap-4 items-start p-2 rounded cursor-pointer hover:bg-gray-200 transition ${
                selectedVideoId === video.videoId ? "bg-gray-300" : ""
              }`}
              onClick={() => setSelectedVideoId(video.videoId)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-40 h-24 object-cover rounded"
              />
              <div>
                <h2 className="text-md font-medium">{video.title}</h2>
              </div>
            </div>
          ))}

          {/* Load More */}
          {nextPageToken && (
            <button
              onClick={() => fetchVideos(nextPageToken)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
