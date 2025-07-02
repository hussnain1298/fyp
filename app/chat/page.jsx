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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userType, setUserType] = useState(null);
  const [orphanageId, setOrphanageId] = useState(orphanageIdFromParams);
  const [donorId, setDonorId] = useState(donorIdFromParams);
  const [orphanageName, setOrphanageName] = useState(null);
  const [donorName, setDonorName] = useState(null);
  const [profilesCache, setProfilesCache] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserType(data.userType);
          if (data.userType === "Orphanage") setOrphanageId(currentUser.uid);
          if (data.userType === "Donor") setDonorId(currentUser.uid);

          if (!chatId && donorIdFromParams && orphanageIdFromParams) {
            const newChatId = `${donorIdFromParams}_${orphanageIdFromParams}`;
            const existing = await getDoc(doc(firestore, "chats", newChatId));
            if (!existing.exists()) {
              await setDoc(doc(firestore, "chats", newChatId), {
                donorId: donorIdFromParams,
                orphanageId: orphanageIdFromParams,
                participants: [donorIdFromParams, orphanageIdFromParams],
              });
            }
            router.replace(`/chat?chatId=${newChatId}`);
          }
        }
      }
    });
    return unsub;
  }, [chatId, donorIdFromParams, orphanageIdFromParams]);

  useEffect(() => {
    if (!chatId) return;
    const fetchChat = async () => {
      const chatDoc = await getDoc(doc(firestore, "chats", chatId));
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        setOrphanageId(data.orphanageId);
        setDonorId(data.donorId || data.participants?.find(p => p !== data.orphanageId));
      }
    };
    fetchChat();
  }, [chatId]);

  useEffect(() => {
    const fetchNames = async () => {
      if (orphanageId) {
        const docRef = await getDoc(doc(firestore, "users", orphanageId));
        setOrphanageName(docRef.exists() ? docRef.data().orgName : orphanageId);
      }
      if (donorId) {
        const docRef = await getDoc(doc(firestore, "users", donorId));
        setDonorName(docRef.exists() ? docRef.data().name : donorId);
      }
    };
    fetchNames();
  }, [orphanageId, donorId]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(firestore, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    messages.forEach(async (m) => {
      if (!profilesCache[m.senderId]) {
        const d = await getDoc(doc(firestore, "users", m.senderId));
        setProfilesCache((prev) => ({ ...prev, [m.senderId]: d.exists() ? d.data() : null }));
      }
    });
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await addDoc(collection(firestore, "chats", chatId, "messages"), {
      senderId: user.uid,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col mx-auto mt-28 max-w-xl h-[80vh] border rounded-lg shadow-lg overflow-hidden">
  <header className="p-4 bg-green-600 text-white font-semibold text-sm">
    <p> Orphanage: <span className="font-bold">{orphanageName || orphanageId}</span></p>
    <p> Donor: <span className="font-bold">{donorName || donorId}</span></p>
  </header>

  <div className="flex-grow p-4 overflow-y-auto bg-gray-50 space-y-2">
    {messages.length === 0 && (
      <p className="text-center text-gray-500 mt-4">No messages yet.</p>
    )}
    {messages.map((msg) => {
      const isMe = msg.senderId === user.uid;
      const profile = profilesCache[msg.senderId];
      const initials = getInitial(profile?.orgName || profile?.name || "U");
      const color = generateColor(profile?.name);
      return (
        <div
          key={msg.id}
          className={`flex items-end space-x-2 ${isMe ? "justify-end" : "justify-start"}`}
        >
          {!isMe && (
            <div
              className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
          )}
          <div
            className={`px-4 py-2 text-sm rounded-xl max-w-xs ${
              isMe
                ? "bg-green-600 text-white ml-auto"
                : "bg-white border border-gray-200 text-gray-800"
            }`}
          >
            {msg.text}
          </div>
          {isMe && (
            <div
              className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
          )}
        </div>
      );
    })}
    <div ref={messagesEndRef} />
  </div>

  <div className="p-3 border-t flex items-center bg-white gap-2">
    <input
      type="text"
      placeholder="Type a message..."
      className="flex-grow border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
    />
    <button
      onClick={sendMessage}
      className="bg-green-600 text-white px-4 py-2 text-sm rounded-full hover:bg-green-700"
    >
      Send
    </button>
  </div>
</div>

  );
}
