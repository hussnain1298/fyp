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

const generateColor = (name) => {
  if (!name) return "#4CAF50";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const val = (hash >> (i * 8)) & 0xff;
    color += ("00" + val.toString(16)).slice(-2);
  }
  return color;
};

const getInitial = (name) => {
  if (!name) return "U";
  return name.charAt(0).toUpperCase();
};

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
  const [loadingOrphanageName, setLoadingOrphanageName] = useState(false);

  const [donorId, setDonorId] = useState(null);
  const [donorName, setDonorName] = useState(null);
  const [loadingDonorName, setLoadingDonorName] = useState(false);

  const [profilesCache, setProfilesCache] = useState({});
  const messagesEndRef = useRef(null);

  // Auth + user data fetch
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
            setOrphanageId(data.userType === "Orphanage" ? currentUser.uid : null);
            setDonorId(data.userType === "Donor" ? currentUser.uid : null);
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          setUserType(null);
          setOrphanageId(null);
          setDonorId(null);
        } finally {
          setLoadingUserData(false);
        }
      } else {
        setUserType(null);
        setOrphanageId(null);
        setDonorId(null);
        setLoadingUserData(false);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch chat participants and set orphanage and donor IDs
  useEffect(() => {
    if (!chatId) return;

    const fetchChatParticipants = async () => {
      try {
        const chatRef = doc(firestore, "chats", chatId);
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          const chatData = chatSnap.data();
          console.log("Chat data fetched:", chatData);  // Debug log

          if (chatData.orphanageId) {
            console.log("Setting orphanageId:", chatData.orphanageId);
            setOrphanageId(chatData.orphanageId);
          }

          const donorIdFromChat =
            chatData.donorId ||
            (chatData.participants?.find((p) => p !== chatData.orphanageId) || null);

          if (donorIdFromChat) {
            console.log("Setting donorId:", donorIdFromChat);
            setDonorId(donorIdFromChat);
          }

          setChatExists(true);
        } else {
          setChatExists(false);
        }
      } catch (error) {
        console.error("Error fetching chat info:", error);
        setChatExists(false);
      }
    };

    fetchChatParticipants();
  }, [chatId]);

  // Fetch orphanage name whenever orphanageId changes
  useEffect(() => {
    if (!orphanageId) {
      setOrphanageName(null);
      return;
    }
    setLoadingOrphanageName(true);

    const fetchOrphanageName = async () => {
      try {
        console.log("Fetching orphanage user data for:", orphanageId);  // Debug log
        const orphanageRef = doc(firestore, "users", orphanageId);
        const orphanageDoc = await getDoc(orphanageRef);
        if (orphanageDoc.exists()) {
          const data = orphanageDoc.data();
          console.log("Orphanage user data:", data);  // Debug log
          setOrphanageName(data.orgName || orphanageId);
        } else {
          console.warn("No orphanage user document found for ID:", orphanageId);
          setOrphanageName(orphanageId);
        }
      } catch (error) {
        console.error("Failed to fetch orphanage name:", error);
        setOrphanageName(orphanageId);
      } finally {
        setLoadingOrphanageName(false);
      }
    };

    fetchOrphanageName();
  }, [orphanageId]);

  // Fetch donor name when donorId changes
  useEffect(() => {
    if (!donorId) {
      setDonorName(null);
      return;
    }
    setLoadingDonorName(true);

    const fetchDonorName = async () => {
      try {
        console.log("Fetching donor user data for:", donorId);  // Debug log
        const donorRef = doc(firestore, "users", donorId);
        const donorSnap = await getDoc(donorRef);
        if (donorSnap.exists()) {
          const data = donorSnap.data();
          console.log("Donor user data:", data);  // Debug log
          setDonorName(data.name || data.orgName || donorId);
        } else {
          console.warn("No donor user document found for ID:", donorId);
          setDonorName("Unknown Donor");
        }
      } catch (error) {
        console.error("Failed to fetch donor name:", error);
        setDonorName("Unknown Donor");
      } finally {
        setLoadingDonorName(false);
      }
    };

    fetchDonorName();
  }, [donorId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(firestore, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      scrollToBottom();

      // Cache profiles for senders
      const senderIds = Array.from(new Set(msgs.map((m) => m.senderId)));
      senderIds.forEach(async (id) => {
        if (!profilesCache[id]) {
          try {
            const profileDoc = await getDoc(doc(firestore, "users", id));
            if (profileDoc.exists()) {
              setProfilesCache((prev) => ({ ...prev, [id]: profileDoc.data() }));
            } else {
              setProfilesCache((prev) => ({ ...prev, [id]: null }));
            }
          } catch (err) {
            console.error("Failed to fetch profile for", id, err);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [chatId, profilesCache]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Send message handler
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

  const messagePayload = {
    chatId,
    lastMessage: newMessage.trim(),
    timestamp: serverTimestamp(),
    read: false,
  };

  if (userType === "Donor" && orphanageId) {
    await setDoc(
      doc(firestore, "notifications", orphanageId, "userNotifications", chatId),
      { ...messagePayload, donorId: user.uid },
      { merge: true }
    );
  }

if (userType === "Donor" && orphanageId) {
  await setDoc(
    doc(firestore, "notifications", orphanageId, "userNotifications", chatId),
    {
      chatId,
      lastMessage: newMessage.trim(),
      timestamp: serverTimestamp(),
      read: false,
      donorId: user.uid,
    },
    { merge: true }
  );
}


  setNewMessage("");
};

  // Mark notifications read for orphanage users
  useEffect(() => {
    if (!chatId || !user || !orphanageId || userType !== "Orphanage") return;

    const markNotificationRead = async () => {
      try {
        const notificationRef = doc(
          firestore,
          "notifications",
          orphanageId,
          "userNotifications",
          chatId
        );
        await setDoc(notificationRef, { read: true }, { merge: true });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    };

    markNotificationRead();
  }, [chatId, user, orphanageId, userType]);

  if (loadingAuth || loadingUserData || loadingOrphanageName || loadingDonorName) {
    return <p className="p-6 text-center">Loading chat data...</p>;
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
        Orphanage:{" "}
        {loadingOrphanageName ? (
          <span>Loading...</span>
        ) : (
          orphanageName || orphanageId || "Unknown"
        )}
        <br />
        Donor:{" "}
        {loadingDonorName ? (
          <span>Loading...</span>
        ) : (
          donorName || donorId || "Unknown"
        )}
      </header>

      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const profile = profilesCache[msg.senderId];
          const photoUrl = profile?.profilePhoto || null;
          const initials = getInitial(profile?.orgName || profile?.name || "User");

          return (
            <div
              key={msg.id}
              className={`mb-2 flex items-end ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2 flex-shrink-0"
                  style={{ backgroundColor: generateColor(profile?.orgName || profile?.name) }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              )}

              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  isMe ? "bg-green-600 text-white" : "bg-white border"
                }`}
              >
                {msg.text}
              </div>

              {isMe && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ml-2 flex-shrink-0"
                  style={{ backgroundColor: generateColor(profile?.orgName || profile?.name) }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              )}
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
