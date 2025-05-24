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
  setDoc,
  getDoc,
  deleteDoc,
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
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [orphanageProfiles, setOrphanageProfiles] = useState({});
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch chats where donor is participant, persist orphanageId if missing
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }

    const chatsRef = collection(firestore, "chats");
    const chatsQuery = query(chatsRef, where("participants", "array-contains", user.uid));

    const unsubscribe = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        const fetchedChats = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const chatData = docSnap.data();
            // Infer orphanageId if missing and persist it
            if (!chatData.orphanageId && chatData.participants) {
              const inferredOrphanageId = chatData.participants.find((p) => p !== user.uid);
              if (inferredOrphanageId) {
                await setDoc(doc(firestore, "chats", docSnap.id), { orphanageId: inferredOrphanageId }, { merge: true });
                console.log(`Set orphanageId ${inferredOrphanageId} for chat ${docSnap.id}`);
                return { id: docSnap.id, ...chatData, orphanageId: inferredOrphanageId };
              }
            }
            return { id: docSnap.id, ...chatData };
          })
        );

        console.log("Chats fetched:", fetchedChats);
        setChats(fetchedChats);
      },
      (error) => {
        console.error("Failed to listen to chats:", error);
        setChats([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch orphanage profiles after chats are loaded and orphanageIds are known
  useEffect(() => {
    const orphanageIds = chats
      .map((chat) => chat.orphanageId)
      .filter((id) => id && !orphanageProfiles[id]);

    if (orphanageIds.length === 0) return;

    const fetchProfiles = async () => {
      const updates = {};
      for (const id of orphanageIds) {
        try {
          console.log(`Fetching profile for orphanageId: ${id}`);
          const docSnap = await getDoc(doc(firestore, "users", id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(`Profile data for ${id}:`, data);
            updates[id] = {
              name: data.orgName || "Unknown Orphanage",
              profilePhoto: data.profilePhoto || null,
            };
          } else {
            console.warn(`No profile found for orphanageId: ${id}`);
            updates[id] = { name: "Unknown Orphanage", profilePhoto: null };
          }
        } catch (error) {
          console.error(`Error fetching profile for orphanageId ${id}:`, error);
          updates[id] = { name: "Unknown Orphanage", profilePhoto: null };
        }
      }
      setOrphanageProfiles((prev) => ({ ...prev, ...updates }));
    };

    fetchProfiles();
  }, [chats, orphanageProfiles]);

  // Mark notification read and open chat
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

  // Delete chat handler
  const handleDeleteChat = async (chatId) => {
    if (!confirm("Are you sure you want to delete this chat? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(firestore, "chats", chatId));
      alert("Chat deleted successfully.");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Failed to delete chat. Please try again.");
    }
  };

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

      {chats.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">No chats available.</p>
      ) : (
        <ul className="bg-white shadow-md rounded-lg divide-y divide-gray-200">
          {chats.map((chat) => {
            const notif = notifications.find((n) => n.chatId === chat.id);
            const orphanageId = chat.orphanageId || null;
            const orphanageProfile = orphanageProfiles[orphanageId] || { name: "Loading...", profilePhoto: null };
            const lastMsg = notif?.lastMessage || "No message";
            const timestamp = notif?.timestamp || null;

            return (
              <li
                key={chat.id}
                className={`cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-green-50 transition ${
                  notif?.read ? "bg-white" : "bg-green-100"
                }`}
                onClick={() => openChat(chat.id)}
                title={`Last updated: ${timestamp ? timestamp.toLocaleString() : "Unknown"}`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {orphanageProfile.profilePhoto ? (
                    <img
                      src={orphanageProfile.profilePhoto}
                      alt={`${orphanageProfile.name} profile`}
                      className="w-12 h-12 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {getInitials(orphanageProfile.name)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg text-gray-900">{orphanageProfile.name}</p>
                    <p className="text-gray-700 mt-1 truncate max-w-xl">{lastMsg}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end min-w-[120px] justify-end space-y-1">
                  <span className="text-sm text-gray-500">
                    {formatRelativeTime(timestamp)}
                  </span>

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
