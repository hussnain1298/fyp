"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const chatId = searchParams.get("chatId");
  const donorIdFromParams = searchParams.get("donorId");
  const orphanageIdFromParams = searchParams.get("orphanageId");

  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [chatExists, setChatExists] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userType, setUserType] = useState(null);
  const [orphanageId, setOrphanageId] = useState(orphanageIdFromParams);
  const [orphanageName, setOrphanageName] = useState(null);
  const [loadingOrphanageName, setLoadingOrphanageName] = useState(false);
  const [donorId, setDonorId] = useState(donorIdFromParams);
  const [donorName, setDonorName] = useState(null);
  const [loadingDonorName, setLoadingDonorName] = useState(false);
  const [profilesCache, setProfilesCache] = useState({});
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
            if (data.userType === "Orphanage") setOrphanageId(currentUser.uid);
            if (data.userType === "Donor") setDonorId(currentUser.uid);

            // If no chatId, create or fetch chat
            if (!chatId && donorIdFromParams && orphanageIdFromParams) {
              const chatPath = `${donorIdFromParams}_${orphanageIdFromParams}`;
              const existingChat = doc(firestore, "chats", chatPath);
              const snap = await getDoc(existingChat);
              if (!snap.exists()) {
                await setDoc(existingChat, {
                  donorId: donorIdFromParams,
                  orphanageId: orphanageIdFromParams,
                  participants: [donorIdFromParams, orphanageIdFromParams],
                });
              }
              router.replace(`/chat?chatId=${chatPath}`);
            }
          }
        } catch {
          setUserType(null);
        } finally {
          setLoadingUserData(false);
        }
      }
    });
    return unsubscribe;
  }, [chatId, donorIdFromParams, orphanageIdFromParams]);

  useEffect(() => {
    if (!chatId) return;
    const fetchChat = async () => {
      const chatRef = doc(firestore, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const data = chatSnap.data();
        setOrphanageId(data.orphanageId);
        const donorFromChat =
          data.donorId || data.participants?.find((p) => p !== data.orphanageId);
        setDonorId(donorFromChat);
        setChatExists(true);
      } else {
        setChatExists(false);
      }
    };
    fetchChat();
  }, [chatId]);

  useEffect(() => {
    if (!orphanageId) return;
    setLoadingOrphanageName(true);
    const fetchName = async () => {
      const docRef = doc(firestore, "users", orphanageId);
      const docSnap = await getDoc(docRef);
      setOrphanageName(docSnap.exists() ? docSnap.data().orgName : orphanageId);
      setLoadingOrphanageName(false);
    };
    fetchName();
  }, [orphanageId]);

  useEffect(() => {
    if (!donorId) return;
    setLoadingDonorName(true);
    const fetchName = async () => {
      const docRef = doc(firestore, "users", donorId);
      const docSnap = await getDoc(docRef);
      setDonorName(docSnap.exists() ? docSnap.data().name || donorId : "Unknown Donor");
      setLoadingDonorName(false);
    };
    fetchName();
  }, [donorId]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(firestore, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.senderId)));
    ids.forEach(async (id) => {
      if (!profilesCache[id]) {
        const docSnap = await getDoc(doc(firestore, "users", id));
        setProfilesCache((prev) => ({
          ...prev,
          [id]: docSnap.exists() ? docSnap.data() : null,
        }));
      }
    });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id || null;

  useEffect(() => {
    if (
      !chatId ||
      !user ||
      userType !== "Orphanage" ||
      !orphanageId ||
      !lastMessage
    ) return;

    if (lastMessage.senderId !== user.uid) {
      setDoc(
        doc(firestore, "notifications", orphanageId, "userNotifications", chatId),
        { read: true },
        { merge: true }
      );
    }
  }, [chatId, user?.uid, userType, orphanageId, lastMessageId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user || !userType) return;
    const text = newMessage.trim();
    const msgRef = collection(firestore, "chats", chatId, "messages");
    await addDoc(msgRef, {
      senderId: user.uid,
      text,
      timestamp: serverTimestamp(),
    });

    const notificationData = {
      chatId,
      lastMessage: text,
      timestamp: serverTimestamp(),
      read: false,
      donorId: donorId || user.uid,
    };

    if (userType === "Donor" && orphanageId) {
      await setDoc(
        doc(firestore, "notifications", orphanageId, "userNotifications", chatId),
        notificationData,
        { merge: true }
      );
    } else if (userType === "Orphanage" && donorId) {
      await setDoc(
        doc(firestore, "notifications", donorId, "userNotifications", chatId),
        notificationData,
        { merge: true }
      );
    }

    setNewMessage("");
  };

  if (loadingAuth || loadingUserData || loadingOrphanageName || loadingDonorName)
    return <p className="p-6 text-center">Loading chat data...</p>;
  if (!user) return <p className="p-6 text-center">Please log in to use chat.</p>;
  if (!chatId) return <p className="p-6 text-center">Initializing chat...</p>;
  if (!chatExists) return <p className="p-6 text-center">Chat does not exist.</p>;

  return (
    <div className="flex flex-col max-w-3xl mx-auto h-screen">
      <header className="p-4 border-b bg-green-600 text-white font-semibold">
        Orphanage: {orphanageName || orphanageId}
        <br />
        Donor: {donorName || donorId}
      </header>
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user.uid;
          const profile = profilesCache[msg.senderId];
          const photoUrl = profile?.profilePhoto || null;
          const initials = getInitial(profile?.orgName || profile?.name || "U");
          return (
            <div
              key={msg.id}
              className={`mb-2 flex items-end ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2"
                  style={{ backgroundColor: generateColor(profile?.name) }}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="w-8 h-8 rounded-full" />
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
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ml-2"
                  style={{ backgroundColor: generateColor(profile?.name) }}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="w-8 h-8 rounded-full" />
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
          placeholder="Type a message..."
          className="flex-grow border rounded-md px-4 py-2"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={!userType}
        />
        <button
          onClick={sendMessage}
          disabled={!userType}
          className={`px-4 py-2 rounded-md ${
            !userType ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 text-white"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
