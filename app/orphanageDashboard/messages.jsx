"use client";

import React, { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
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

export default function OrphanageMessages() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [donorProfiles, setDonorProfiles] = useState({});
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const notifRef = collection(firestore, "notifications", user.uid, "userNotifications");
    const notifQuery = query(notifRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      notifQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setNotifications([]);
          return;
        }

        const notifs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            chatId: data.chatId,
            lastMessage: data.lastMessage,
            read: data.read,
            timestamp: data.timestamp?.toDate(),
            donorId: data.donorId,
          };
        });

        setNotifications(notifs);
      },
      (error) => {
        console.error("Failed to listen to notifications:", error);
        setNotifications([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const donorIds = notifications
      .map((n) => n.donorId)
      .filter((id) => id && !donorProfiles[id]);

    if (donorIds.length === 0) return;

    const fetchProfiles = async () => {
      const updates = {};
      for (const id of donorIds) {
        try {
          const profileDoc = await getDoc(doc(firestore, "users", id));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            updates[id] = {
              name: data.orgName || data.name || "Unknown Donor",
              profilePhoto: data.profilePhoto || null,
            };
          } else {
            updates[id] = { name: "Unknown Donor", profilePhoto: null };
          }
        } catch (err) {
          console.error("Failed to fetch donor profile for ", id, err);
          updates[id] = { name: "Unknown Donor", profilePhoto: null };
        }
      }
      setDonorProfiles((prev) => ({ ...prev, ...updates }));
    };

    fetchProfiles();
  }, [notifications, donorProfiles]);

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

  if (!user)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-700 text-xl">Loading user...</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 mt-20 bg-gray-50 min-h-screen rounded-lg shadow-lg">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-gray-900">
        Chat with Donors
      </h2>

      {notifications.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">No messages yet.</p>
      ) : (
        <ul className="bg-white shadow-md rounded-lg divide-y divide-gray-200">
          {notifications.map(({ id, chatId, lastMessage, read, timestamp, donorId }) => {
            const donorProfile = donorProfiles[donorId] || {
              name: "Loading...",
              profilePhoto: null,
            };

            return (
              <li
                key={id}
                onClick={() => openChat(chatId)}
                className={`cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-green-50 transition ${
                  read ? "bg-white" : "bg-green-100"
                }`}
                title={`Last updated: ${timestamp ? timestamp.toLocaleString() : "Unknown"}`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  {donorProfile.profilePhoto ? (
                    <img
                      src={donorProfile.profilePhoto}
                      alt={`${donorProfile.name} profile`}
                      className="w-12 h-12 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {getInitials(donorProfile.name)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-lg text-gray-900">{donorProfile.name}</p>
                    <p className="text-gray-600 mt-1 truncate max-w-xl">{lastMessage}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end min-w-[100px]">
                  <p className="text-sm text-gray-500">{formatRelativeTime(timestamp)}</p>
                  {!read && (
                    <span className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold select-none mt-1">
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
