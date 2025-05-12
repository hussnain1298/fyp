"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Import the necessary hooks
import { firestore, auth } from "@/lib/firebase"; // Import Firebase SDK
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import ChatSidebar from "@/components/chat/chat-sidebar"; // Import sidebar component
import ChatWindow from "@/components/chat/chat-window"; // Import chat window component

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChatId, setActiveChatId] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [chatData, setChatData] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams(); // Get query parameters

  // Extract parameters from query
  const chatId = searchParams.get("chatId");
  const title = searchParams.get("title");
  const description = searchParams.get("description");
  const orphanageId = searchParams.get("orphanageId");
  const requestId = searchParams.get("requestId");
  const orphanageEmail = searchParams.get("orphanageEmail");

  // Fetch chat and user data when the component loads
  useEffect(() => {
    if (!chatId) {
      setError("No chat ID provided.");
      setLoading(false);
      return;
    }

    const fetchChatData = async () => {
      try {
        // Fetch chat data
        const chatRef = doc(firestore, "chats", chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
          setChatData(chatDoc.data());
          setActiveChatId(chatId);

          // Check the participants in the chat
          const participants = chatDoc.data().participants;
          const currentUser = auth.currentUser;

          // If current user is not a participant, set an error
          if (!participants[currentUser.uid]) {
            setError("You are not a participant in this chat.");
            setLoading(false);
            return;
          }

          // Fetch the other participant details (orphanage or donor)
          const otherUserId = Object.keys(participants).find(
            (id) => id !== currentUser.uid
          );

          // Fetch the user details (name, role) for the other participant
          const userRef = doc(firestore, "users", otherUserId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setOtherUser(userDoc.data());
          } else {
            setError("User not found.");
          }

          setLoading(false);
        } else {
          setError("Chat not found.");
          setLoading(false);
        }
      } catch (err) {
        setError("Error fetching chat data: " + err.message);
        setLoading(false);
      }
    };

    fetchChatData();
  }, [chatId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 p-4 rounded-md">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">{title}</h1>
        <p className="mb-6">{description}</p>

        <div className="flex flex-col md:flex-row">
          <ChatSidebar activeChatId={activeChatId} setActiveChatId={setActiveChatId} />
          <ChatWindow chatId={activeChatId} otherUser={otherUser} />
        </div>
      </div>
    </div>
  );
}
