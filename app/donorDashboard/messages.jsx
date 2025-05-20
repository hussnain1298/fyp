"use client";

import React, { useEffect, useState, useCallback } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({}); // chatId => messages[]
  const [lastVisibleByChat, setLastVisibleByChat] = useState({}); // chatId => lastVisible doc for pagination
  const [loadingMoreByChat, setLoadingMoreByChat] = useState({}); // chatId => loading status
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // Fetch notifications for donor user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const notificationsRef = collection(
      firestore,
      "notifications",
      user.uid,
      "userNotifications"
    );
    const notifQuery = query(notificationsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      notifQuery,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          chatId: doc.data().chatId,
          lastMessage: doc.data().lastMessage,
          read: doc.data().read,
          timestamp: doc.data().timestamp?.toDate(),
          orphanageId: doc.data().orphanageId,
        }));
        setNotifications(notifs);
      },
      (error) => {
        console.error("Failed to listen to notifications:", error);
        setNotifications([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch chats where current user (donor) is participant
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const chatsRef = collection(firestore, "chats");
    const chatsQuery = query(
      chatsRef,
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const fetchedChats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChats(fetchedChats);
      },
      (error) => {
        console.error("Failed to listen to chats:", error);
        setChats([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Subscribe real-time to the first page (10) messages of each chat
  useEffect(() => {
    if (chats.length === 0) {
      setMessagesByChat({});
      setLastVisibleByChat({});
      return;
    }

    const unsubscribes = chats.map((chat) => {
      const messagesRef = collection(firestore, "chats", chat.id, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(10));

      return onSnapshot(messagesQuery, (snapshot) => {
        const msgs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .reverse(); // ascending order for display
        setMessagesByChat((prev) => ({ ...prev, [chat.id]: msgs }));

        if (snapshot.docs.length > 0) {
          setLastVisibleByChat((prev) => ({
            ...prev,
            [chat.id]: snapshot.docs[snapshot.docs.length - 1],
          }));
        }
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [chats]);

  // Load more messages paginated for a chat
  const loadMoreMessages = useCallback(
    async (chatId) => {
      if (loadingMoreByChat[chatId]) return;
      if (!lastVisibleByChat[chatId]) return;

      setLoadingMoreByChat((prev) => ({ ...prev, [chatId]: true }));

      try {
        const messagesRef = collection(firestore, "chats", chatId, "messages");
        const nextQuery = query(
          messagesRef,
          orderBy("timestamp", "desc"),
          startAfter(lastVisibleByChat[chatId]),
          limit(10)
        );

        const snapshot = await getDocs(nextQuery);
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (newMessages.length > 0) {
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: [...newMessages.reverse(), ...(prev[chatId] || [])],
          }));

          setLastVisibleByChat((prev) => ({
            ...prev,
            [chatId]: snapshot.docs[snapshot.docs.length - 1],
          }));
        }
      } catch (err) {
        console.error("Failed to load more messages for chat", chatId, err);
      } finally {
        setLoadingMoreByChat((prev) => ({ ...prev, [chatId]: false }));
      }
    },
    [lastVisibleByChat, loadingMoreByChat]
  );

  const openChat = (chatId) => {
    if (!chatId) return;
    router.push(`/chat?chatId=${chatId}`);
  };

  if (!user) return <p>Loading user...</p>;

  return (
    <div>
      <h2 className="font-bold mb-4 mt-20 text-3xl">Chat with Orphanages</h2>
      {chats.length === 0 ? (
        <p>No chats available.</p>
      ) : (
        <ul>
          {chats.map((chat) => {
            const notif = notifications.find((n) => n.chatId === chat.id);
            const orgName = chat.orgName || "Unknown Orphanage";

            return (
              <li
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className="cursor-pointer p-2 border-b hover:bg-gray-100"
              >
                <p>
                  <strong>Chat with:</strong> {orgName}
                </p>
                <p>
                  <strong>Last message:</strong> {notif?.lastMessage || "No message"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
