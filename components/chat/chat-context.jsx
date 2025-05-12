"use client"

import { createContext, useContext, useState, useEffect } from "react"
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  limit,
} from "firebase/firestore"
import { auth, firestore } from "@/lib/firebase"

const ChatContext = createContext(undefined)

export const ChatProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [userProfiles, setUserProfiles] = useState({}) // Cache for user profiles

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
      setLoading(user === null)
    })
    return unsubscribe
  }, [])

  // Fetch user's chats when authenticated
  useEffect(() => {
    if (!currentUser) return

    const chatsQuery = query(collection(firestore, "chats"), where("participants", "array-contains", currentUser.uid))

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsList = []
      let totalUnread = 0

      for (const doc of snapshot.docs) {
        const chatData = doc.data()

        // Calculate unread count for current user
        const unreadCount = chatData.unreadCount?.[currentUser.uid] || 0
        totalUnread += unreadCount

        // Get participant names
        const participantNames = {}
        for (const participantId of chatData.participants) {
          if (participantId !== currentUser.uid) {
            try {
              const profile = await getUserProfile(participantId)
              if (profile) {
                // Use the most specific name available, falling back to email or ID
                participantNames[participantId] =
                  profile.fullName ||
                  profile.name ||
                  profile.displayName ||
                  profile.email ||
                  `User ${participantId.substring(0, 5)}`
              }
            } catch (error) {
              console.error("Error fetching participant profile:", error)
              participantNames[participantId] = `User ${participantId.substring(0, 5)}`
            }
          }
        }

        chatsList.push({
          id: doc.id,
          participants: chatData.participants,
          participantNames,
          lastMessage: chatData.lastMessage,
          unreadCount: unreadCount,
          createdAt: chatData.createdAt,
          requestId: chatData.requestId, // Store the request ID if available
        })
      }

      // Set total unread count
      setTotalUnreadCount(totalUnread)

      // Sort chats by last message timestamp (newest first)
      chatsList.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp?.toMillis() || a.createdAt?.toMillis() || 0
        const timeB = b.lastMessage?.timestamp?.toMillis() || b.createdAt?.toMillis() || 0
        return timeB - timeA
      })

      setChats(chatsList)
      setLoading(false)
    })

    return unsubscribe
  }, [currentUser])

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (!currentChat) {
      setMessages([])
      return
    }

    const messagesQuery = query(
      collection(firestore, `chats/${currentChat.id}/messages`),
      orderBy("timestamp", "asc"),
      limit(100), // Limit to last 100 messages for performance
    )

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesList = []

      for (const doc of snapshot.docs) {
        const messageData = doc.data()
        let senderProfile = { name: "Loading..." }

        try {
          senderProfile = await getUserProfile(messageData.senderId)
        } catch (error) {
          console.error("Error fetching sender profile:", error)
        }

        // Use the most specific name available, falling back to email or ID
        const senderName =
          senderProfile?.fullName ||
          senderProfile?.name ||
          senderProfile?.displayName ||
          senderProfile?.email ||
          `User ${messageData.senderId.substring(0, 5)}`

        messagesList.push({
          id: doc.id,
          text: messageData.text,
          senderId: messageData.senderId,
          senderName: senderName,
          timestamp: messageData.timestamp,
          read: messageData.read || false,
        })
      }

      setMessages(messagesList)

      // Mark messages as read
      if (currentUser) {
        snapshot.docs.forEach(async (doc) => {
          const messageData = doc.data()
          if (!messageData.read && messageData.senderId !== currentUser.uid) {
            await updateDoc(doc.ref, { read: true })
          }
        })

        // Update unread count in chat document
        if (currentChat) {
          const chatRef = doc(firestore, "chats", currentChat.id)
          const chatDoc = await getDoc(chatRef)
          if (chatDoc.exists()) {
            const chatData = chatDoc.data()
            const unreadCount = chatData.unreadCount || {}
            unreadCount[currentUser.uid] = 0
            await updateDoc(chatRef, { unreadCount })
          }
        }
      }
    })

    return unsubscribe
  }, [currentChat, currentUser])

  const selectChat = (chatId) => {
    const selected = chats.find((chat) => chat.id === chatId) || null
    setCurrentChat(selected)
  }

  const sendMessage = async (text) => {
    if (!currentUser || !currentChat || !text.trim()) return

    try {
      // Add message to the messages subcollection
      await addDoc(collection(firestore, `chats/${currentChat.id}/messages`), {
        text,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        read: false,
      })

      // Update the chat document with the last message
      const chatRef = doc(firestore, "chats", currentChat.id)
      const chatDoc = await getDoc(chatRef)

      if (chatDoc.exists()) {
        const chatData = chatDoc.data()
        const unreadCount = chatData.unreadCount || {}

        // Increment unread count for all participants except the sender
        currentChat.participants.forEach((participantId) => {
          if (participantId !== currentUser.uid) {
            unreadCount[participantId] = (unreadCount[participantId] || 0) + 1
          }
        })

        await updateDoc(chatRef, {
          lastMessage: {
            text,
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
          },
          unreadCount,
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const createNewChat = async (otherUserId, requestId = null) => {
    if (!currentUser || otherUserId === currentUser.uid) {
      throw new Error("Cannot create chat")
    }

    // Check if a chat already exists between these users
    const existingChatQuery = query(
      collection(firestore, "chats"),
      where("participants", "array-contains", currentUser.uid),
    )

    const snapshot = await getDocs(existingChatQuery)

    for (const doc of snapshot.docs) {
      const chatData = doc.data()
      if (chatData.participants.includes(otherUserId)) {
        // If requestId is provided and this is a new request-specific chat
        if (requestId && chatData.requestId !== requestId) {
          continue // This is for a different request, so create a new chat
        }
        // Chat already exists, return its ID
        return doc.id
      }
    }

    // Create a new chat
    try {
      // Get current user profile
      const currentUserProfile = await getUserProfile(currentUser.uid)

      // Get other user profile
      const otherUserProfile = await getUserProfile(otherUserId)

      // Create chat document
      const chatRef = await addDoc(collection(firestore, "chats"), {
        participants: [currentUser.uid, otherUserId],
        participantInfo: {
          [currentUser.uid]: {
            name:
              currentUserProfile?.fullName ||
              currentUserProfile?.name ||
              currentUserProfile?.displayName ||
              currentUserProfile?.email ||
              `User ${currentUser.uid.substring(0, 5)}`,
            userType: currentUserProfile?.userType || "Unknown",
          },
          [otherUserId]: {
            name:
              otherUserProfile?.fullName ||
              otherUserProfile?.name ||
              otherUserProfile?.displayName ||
              otherUserProfile?.email ||
              `User ${otherUserId.substring(0, 5)}`,
            userType: otherUserProfile?.userType || "Unknown",
          },
        },
        createdAt: serverTimestamp(),
        requestId: requestId, // Store the request ID if provided
        unreadCount: {
          [currentUser.uid]: 0,
          [otherUserId]: 0,
        },
      })

      return chatRef.id
    } catch (error) {
      console.error("Error creating new chat:", error)
      throw error
    }
  }

  const getUserProfile = async (userId) => {
    // Check if we already have this profile in cache
    if (userProfiles[userId]) {
      return userProfiles[userId]
    }

    try {
      // First check if user exists in users collection
      const userRef = doc(firestore, "users", userId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()

        // Create a profile with all possible name fields and email
        const profile = {
          id: userId,
          fullName: userData.fullName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: userData.name,
          displayName: userData.displayName,
          email: userData.email || userDoc.id, // Use ID as fallback
          userType: userData.userType,
        }

        // Cache the profile
        setUserProfiles((prev) => ({ ...prev, [userId]: profile }))

        return profile
      }

      // If not found in users collection, check if it's a request ID
      try {
        const requestRef = doc(firestore, "requests", userId)
        const requestDoc = await getDoc(requestRef)

        if (requestDoc.exists()) {
          const requestData = requestDoc.data()

          // For requests, try to get the orphanage info
          let orphanageProfile = { name: "Unknown Orphanage" }
          if (requestData.orphanageId) {
            try {
              const orphanageRef = doc(firestore, "users", requestData.orphanageId)
              const orphanageDoc = await getDoc(orphanageRef)
              if (orphanageDoc.exists()) {
                const orphanageData = orphanageDoc.data()
                orphanageProfile = {
                  name:
                    orphanageData.fullName ||
                    orphanageData.orgName ||
                    orphanageData.name ||
                    orphanageData.email ||
                    "Unknown Orphanage",
                }
              }
            } catch (error) {
              console.error("Error fetching orphanage profile:", error)
            }
          }

          const profile = {
            id: userId,
            name: requestData.title || `Request from ${orphanageProfile.name}`,
            email: requestData.orphanageEmail || "No email",
            userType: "Request",
          }

          // Cache the profile
          setUserProfiles((prev) => ({ ...prev, [userId]: profile }))

          return profile
        }
      } catch (requestError) {
        console.log("Error checking request ID, using default profile:", requestError)
      }

      // If we get here, we couldn't find the user
      // Create a default profile with the user ID
      const defaultProfile = {
        id: userId,
        name: `User ${userId.substring(0, 5)}`,
        email: `user-${userId.substring(0, 5)}@example.com`,
        userType: "Unknown",
      }

      // Cache the default profile
      setUserProfiles((prev) => ({ ...prev, [userId]: defaultProfile }))

      return defaultProfile
    } catch (error) {
      console.error("Error fetching user profile:", error)
      // Return a default profile instead of throwing an error
      const defaultProfile = {
        id: userId,
        name: `User ${userId.substring(0, 5)}`,
        email: `user-${userId.substring(0, 5)}@example.com`,
        userType: "Unknown",
      }

      // Cache the default profile to avoid repeated failed requests
      setUserProfiles((prev) => ({ ...prev, [userId]: defaultProfile }))

      return defaultProfile
    }
  }

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        messages,
        loading,
        totalUnreadCount,
        sendMessage,
        selectChat,
        createNewChat,
        getUserProfile,
        currentUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
