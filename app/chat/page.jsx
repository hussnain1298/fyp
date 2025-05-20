"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId");

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [chatExists, setChatExists] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userType, setUserType] = useState(null);
  const [orphanageId, setOrphanageId] = useState(null);
  const [orphanageName, setOrphanageName] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);

      if (currentUser) {
        setLoadingUserData(true);
        try {
          const userRef = doc(firestore, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserType(data.userType || null);
            setOrphanageId(data.orphanageId || null);
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          setUserType(null);
          setOrphanageId(null);
        } finally {
          setLoadingUserData(false);
        }
      } else {
        setUserType(null);
        setOrphanageId(null);
        setLoadingUserData(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!orphanageId) return;

    const fetchOrphanageName = async () => {
      try {
        const orphanageRef = doc(firestore, "users", orphanageId);
        const orphanageDoc = await getDoc(orphanageRef);
        if (orphanageDoc.exists()) {
          setOrphanageName(orphanageDoc.data().orgName || orphanageId);
        } else {
          setOrphanageName(orphanageId);
        }
      } catch (error) {
        console.error("Failed to fetch orphanage name:", error);
        setOrphanageName(orphanageId);
      }
    };

    fetchOrphanageName();
  }, [orphanageId]);

  useEffect(() => {
    if (!chatId) return;

    const chatRef = doc(firestore, "chats", chatId);
    getDoc(chatRef).then((chatSnap) => {
      if (!chatSnap.exists()) {
        setChatExists(false);
        return;
      }
      setChatExists(true);

      if (!orphanageId) {
        const inferredOrphanageId = chatSnap.data().orphanageId || chatSnap.data().uid || null;
        setOrphanageId(inferredOrphanageId);
      }

      const messagesRef = collection(firestore, "chats", chatId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
        scrollToBottom();
      });

      return () => unsubscribe();
    });
  }, [chatId, orphanageId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    if (loadingUserData || !userType) {
      console.warn("User data loading or userType unknown, cannot send message.");
      return;
    }

    const messagesRef = collection(firestore, "chats", chatId, "messages");
    await addDoc(messagesRef, {
      senderId: user.uid,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });

    console.log("Message sent by", user.uid);
    console.log("userType:", userType, "orphanageId before check:", orphanageId);

    let targetOrphanageId = orphanageId;

    if (userType === "Donor" && !targetOrphanageId) {
      const chatRef = doc(firestore, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const participants = chatSnap.data().participants || [];
        targetOrphanageId = participants.find((p) => p !== user.uid);
        console.log("Inferred orphanageId:", targetOrphanageId);
        setOrphanageId(targetOrphanageId);
      }
    }

    if (userType === "Donor" && targetOrphanageId) {
      const notificationRef = doc(
        firestore,
        "notifications",
        targetOrphanageId,
        "userNotifications",
        chatId
      );
      console.log(`Updating notification for orphanage: ${targetOrphanageId}, chat: ${chatId}`);
      await setDoc(notificationRef, {
        chatId,
        donorId: user.uid,
        lastMessage: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false,
      });
    } else {
      console.warn("Notification not updated - userType or orphanageId missing");
    }

    setNewMessage("");
  };

  useEffect(() => {
    if (!chatId || !user || !orphanageId || !userType) return;

    if (userType === "Orphanage") {
      const markNotificationRead = async () => {
        try {
          const notificationRef = doc(
            firestore,
            "notifications",
            orphanageId,
            "userNotifications",
            chatId
          );
          await setDoc(
            notificationRef,
            { read: true },
            { merge: true }
          );
          console.log(`Notification marked as read for chat ${chatId}`);
        } catch (error) {
          console.error("Failed to mark notification as read:", error);
        }
      };

      markNotificationRead();
    }
  }, [chatId, user, orphanageId, userType]);

  if (loadingAuth) {
    return <p className="p-6 text-center">Loading authentication...</p>;
  }

  if (!user) {
    return <p className="p-6 text-center">Please log in to use chat.</p>;
  }

  if (!chatId) {
    return <p className="p-6 text-center">No chat selected.</p>;
  }

  if (!chatExists) {
    return <p className="p-6 text-center">Chat does not exist.</p>;
  }

  return (
    <div className="flex flex-col max-w-3xl mx-auto h-screen">
      <header className="p-4 border-b bg-green-600 text-white font-semibold">
        Chat with Orphanage: {orphanageName || orphanageId || "Unknown"}
      </header>

      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          return (
            <div
              key={msg.id}
              className={`mb-2 flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  isMe ? "bg-green-600 text-white" : "bg-white border"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t flex space-x-2">
        <input
          type="text"
          id="message"
          name="message"
          placeholder="Type a message..."
          className="flex-grow border rounded-md px-4 py-2"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loadingUserData || !userType}
        />
        <button
          onClick={sendMessage}
          disabled={loadingUserData || !userType}
          className={`px-4 py-2 rounded-md ${
            loadingUserData || !userType
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
