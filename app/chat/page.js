'use client';  // Ensure that the component is client-side only

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react"; // Import Suspense
import ChatBox from "./ChatBox";

const ChatPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const title = searchParams.get("title") || "No Title";
  const description = searchParams.get("description") || "No Description";
  const orphanageId = searchParams.get("orphanageId");
  const requestId = searchParams.get("requestId");
  const orphanageEmail = searchParams.get("orphanageEmail");

  const [chatId, setChatId] = useState(null);
  const [error, setError] = useState("");

  // ✅ Generate a unique chatId using orphanageId and requestId
  useEffect(() => {
    if (!orphanageId || !requestId) {
      console.error("❌ Missing orphanageId or requestId!");
      setError("Invalid chat request. Missing required details.");
      return;
    }

    const generatedChatId = `${orphanageId}_${requestId}`;
    setChatId(generatedChatId);

    console.log("📢 Chat Page Loaded!");
    console.log("🟢 Title:", title);
    console.log("🟢 Description:", description);
    console.log("🟢 Orphanage ID:", orphanageId);
    console.log("🟢 Request ID:", requestId);
    console.log("🟢 Orphanage Email:", orphanageEmail);
    console.log("🟢 Generated Chat ID:", generatedChatId);
  }, [title, description, orphanageId, requestId, orphanageEmail]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white shadow-md rounded-lg">
        {/* 🔹 Request Title & Description */}
        <h2 className="text-2xl font-bold text-center text-gray-700">{title}</h2>
        <p className="text-center text-gray-500">{description}</p>

        {/* 🔹 Request Details */}
        <div className="bg-gray-100 p-3 rounded-md mt-3">
          <p><strong>Request ID:</strong> {requestId || "N/A"}</p>
          <p><strong>Orphanage Email:</strong> {orphanageEmail || "N/A"}</p>
          <p><strong>Orphanage ID:</strong> {orphanageId || "N/A"}</p>
        </div>

        {/* 🔹 Error Handling */}
        {error ? (
          <p className="text-center text-red-500 mt-4">{error}</p>
        ) : (
          chatId && <ChatBox chatId={chatId} />
        )}
      </div>
    </div>
  );
};

// Wrap the ChatPage component with Suspense
const ChatPageWithSuspense = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPage />
    </Suspense>
  );
};

export default ChatPageWithSuspense;
