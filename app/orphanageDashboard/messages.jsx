"use client";

import React, { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      console.log("No user yet, skipping notifications query.");
      setNotifications([]); // Clear notifications if no user
      return;
    }

    console.log("Fetching notifications for orphanage UID:", user.uid);

    const notificationsRef = collection(firestore, "notifications", user.uid, "userNotifications");
    const q = query(notificationsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} notification docs`);
        if (snapshot.empty) {
          setNotifications([]);
          return;
        }

        const notifs = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Notification doc:", doc.id, data);
          return {
            id: doc.id,
            chatId: data.chatId || "Unknown",
            lastMessage: data.lastMessage || "No message",
            read: data.read ?? false,
            donorId: data.donorId || null,
            timestamp: data.timestamp?.toDate?.() || null,
          };
        });

        setNotifications(notifs);
      },
      (error) => {
        console.error("Failed to listen notifications:", error);
        setNotifications([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const openChat = (chatId) => {
    if (!chatId) return;
    console.log("Opening chat with chatId:", chatId);
    router.push(`/chat?chatId=${chatId}`);
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h2 className="font-bold mb-4 mt-20">Chat with Donors</h2>
      {notifications.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul>
          {notifications.map(({ id, chatId, lastMessage, read, timestamp }) => (
            <li
              key={id}
              onClick={() => openChat(chatId)}
              className="cursor-pointer p-2 border-b hover:bg-gray-100"
              title={`Last updated: ${timestamp ? timestamp.toLocaleString() : "Unknown"}`}
            >
              <p>
                <strong>Chat ID:</strong> {chatId.substring(0, 6)}...
              </p>
              <p>
                <strong>Last message:</strong> {lastMessage}
              </p>
            
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
