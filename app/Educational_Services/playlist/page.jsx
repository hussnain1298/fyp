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
            playlistId,
            key: API_KEY,
            pageToken,
          },
        }
      );

      const newVideos = response.data.items.map((item) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));

      setVideos((prev) => [...prev, ...newVideos]);
      setNextPageToken(response.data.nextPageToken || "");
      if (!selectedVideoId && newVideos.length > 0) {
        setSelectedVideoId(newVideos[0].videoId);
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (playlistId) fetchVideos();
  }, [playlistId]);

  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="text-2xl md:text-3xl font-bold px-6 py-4 bg-green-600 shadow sticky top-0 z-10">
        {title}
      </h1>

      <div className="flex flex-col md:flex-row">
        {/* Video Player */}
        <div className="w-full md:w-1/2 p-4">
          {selectedVideoId && (
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
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

        {/* Playlist */}
        <div className="w-full md:w-1/2 p-4 max-h-[80vh] overflow-y-auto space-y-4">
          {videos.map((video, index) => (
            <div
              key={index}
              onClick={() => setSelectedVideoId(video.videoId)}
              className={`flex gap-4 items-start p-2 rounded cursor-pointer transition ${
                selectedVideoId === video.videoId
                  ? "bg-gray-300"
                  : "hover:bg-gray-100"
              }`}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-32 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h2 className="text-sm sm:text-base font-medium">
                  {video.title}
                </h2>
              </div>
            </div>
          ))}

          {nextPageToken && (
            <div className="text-center mt-4">
              <button
                onClick={() => fetchVideos(nextPageToken)}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
