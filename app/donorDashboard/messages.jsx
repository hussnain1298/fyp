"use client";

import React, { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  limit,
  orderBy as orderByFB,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

const formatRelativeTime = (date) => {
  if (!date) return "Unknown";
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export default function DonorMessages() {
  const [orphanageSearchResult, setOrphanageSearchResult] = useState(null);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [orphanageProfiles, setOrphanageProfiles] = useState({});
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const notifRef = collection(firestore, "notifications", user.uid, "userNotifications");
    const notifQuery = query(notifRef, orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const updated = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      }));
      setNotifications(updated);
    });
    return () => unsubscribe();
  }, [user]);

  const startChat = async () => {
    if (!user || !orphanageSearchResult) return;

    const existingChat = chats.find((chat) => chat.orphanageId === orphanageSearchResult.uid);
    if (existingChat) {
      return router.push(`/chat?chatId=${existingChat.id}`);
    }

    try {
      const chatRef = await addDoc(collection(firestore, "chats"), {
        donorId: user.uid,
        orphanageId: orphanageSearchResult.uid,
        participants: [user.uid, orphanageSearchResult.uid],
        createdAt: new Date(),
      });
      router.push(`/chat?chatId=${chatRef.id}`);
    } catch (e) {
      console.error("Failed to start chat:", e);
    }
  };

  useEffect(() => {
    if (!search) {
      setOrphanageSearchResult(null);
      return;
    }

    const runFuzzySearch = async () => {
      try {
        const orphanageQuery = query(
          collection(firestore, "users"),
          where("userType", "==", "Orphanage")
        );
        const snap = await getDocs(orphanageQuery);
        const match = snap.docs
          .map((doc) => ({ id: doc.id, uid: doc.id, ...doc.data() }))
          .find((user) =>
            (user.orgName || user.fullName || "").toLowerCase().includes(search.toLowerCase())
          );
        setOrphanageSearchResult(match || null);
      } catch (error) {
        console.error("Search failed:", error);
        setOrphanageSearchResult(null);
      }
    };

    runFuzzySearch();
  }, [search]);

  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const chatsRef = collection(firestore, "chats");
      const chatsQuery = query(chatsRef, where("participants", "array-contains", user.uid));
      const snapshot = await getDocs(chatsQuery);

      const enrichedChats = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const chatData = docSnap.data();
          const chatId = docSnap.id;
          const orphanageId = chatData.orphanageId || chatData.participants.find((p) => p !== user.uid);

          let lastMessage = null;
          let lastTimestamp = null;

          try {
            const messagesQuery = query(
              collection(firestore, "chats", chatId, "messages"),
              orderByFB("timestamp", "desc"),
              limit(1)
            );
            const messagesSnap = await getDocs(messagesQuery);
            if (!messagesSnap.empty) {
              const msg = messagesSnap.docs[0].data();
              lastMessage = msg.text || "";
              lastTimestamp = msg.timestamp?.toDate() || null;
            }
          } catch (e) {
            console.error("Error fetching last message", e);
          }

          return {
            id: chatId,
            ...chatData,
            orphanageId,
            lastMessage,
            lastTimestamp,
          };
        })
      );

      setChats(enrichedChats);
    };

    fetchChats();
  }, [user]);

  useEffect(() => {
    const orphanageIds = chats
      .map((chat) => chat.orphanageId)
      .filter((id) => id && !orphanageProfiles[id]);

    if (orphanageIds.length === 0) return;

    const fetchProfiles = async () => {
      const updates = {};
      for (const id of orphanageIds) {
        try {
          const docSnap = await getDoc(doc(firestore, "users", id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            updates[id] = {
              name: data.orgName || data.fullName || "Unknown Orphanage",
              orgName: data.orgName || "",
              profilePhoto: data.profilePhoto || null,
            };
          } else {
            updates[id] = { name: "Unknown Orphanage", orgName: "", profilePhoto: null };
          }
        } catch {
          updates[id] = { name: "Unknown Orphanage", orgName: "", profilePhoto: null };
        }
      }
      setOrphanageProfiles((prev) => ({ ...prev, ...updates }));
    };

    fetchProfiles();
  }, [chats, orphanageProfiles]);

  const openChat = async (chatId) => {
    if (!chatId) return;
    try {
      const notifRef = doc(firestore, "notifications", user.uid, "userNotifications", chatId);
      await setDoc(notifRef, { read: true }, { merge: true });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
    router.push(`/chat?chatId=${chatId}`);
  };

  const filteredChats = chats.filter((chat) => {
    const profile = orphanageProfiles[chat.orphanageId];
    const searchTarget = profile?.orgName?.toLowerCase() || profile?.name?.toLowerCase() || "";
    const matchesSearch = searchTarget.includes(search.toLowerCase());
    const hasMessage = !!chat.lastMessage || !!chat.lastTimestamp;
    return search ? matchesSearch : hasMessage;
  });

  if (!user)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-700 text-xl">Loading user...</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 mt-20 bg-gray-50 min-h-screen rounded-lg shadow-lg">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-gray-900">
        Chat with Orphanages
      </h2>

      <input
        type="text"
        placeholder="Search orphanage by name..."
        className="mb-6 w-full px-4 py-2 border rounded focus:outline-none focus:ring"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {search && orphanageSearchResult && filteredChats.length === 0 && (
        <div
          className="cursor-pointer flex justify-between items-center bg-white p-4 mb-2 rounded shadow hover:bg-green-100"
          onClick={startChat}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
              {getInitials(orphanageSearchResult.orgName || orphanageSearchResult.fullName)}
            </div>
            <div className="text-gray-800 font-medium">
              {orphanageSearchResult.orgName || orphanageSearchResult.fullName}
            </div>
          </div>
          <span className="text-sm text-green-500 font-semibold">Start Chat</span>
        </div>
      )}

      {filteredChats.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">No chats available.</p>
      ) : (
        <ul className="bg-white shadow-md rounded-lg divide-y divide-gray-200">
          {filteredChats.map((chat) => {
            const profile = orphanageProfiles[chat.orphanageId] || {
              name: "Loading...",
              profilePhoto: null,
            };
            const notif = notifications.find((n) => n.id === chat.id);

            return (
              <li
                key={chat.id}
                className="cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-green-50 transition"
                onClick={() => openChat(chat.id)}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {profile.profilePhoto ? (
                    <img
                      src={profile.profilePhoto}
                      alt={`${profile.name} profile`}
                      className="w-12 h-12 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {getInitials(profile.name)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg text-gray-900">{profile.name}</p>
                    <p className="text-gray-700 mt-1 truncate max-w-xl">{chat.lastMessage || "No message"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[120px] justify-end space-y-1">
                  <span className="text-sm text-gray-500">{formatRelativeTime(chat.lastTimestamp)}</span>
                  {!notif?.read && (
                    <span className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold select-none">
                      New
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
