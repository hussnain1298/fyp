import { firestore, auth, storage } from "@/lib/firebase"
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
} from "firebase/firestore"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"

// Create or get a chat between two users
export const getOrCreateChat = async (orphanageId, donorId) => {
  try {
    console.log("getOrCreateChat called with:", { orphanageId, donorId })

    if (!orphanageId || !donorId) {
      console.error("Missing required parameters:", { orphanageId, donorId })
      throw new Error("Both orphanageId and donorId are required")
    }

    const user = auth.currentUser
    if (!user) {
      throw new Error("You must be logged in to create or access chats")
    }

    // Verify the current user is either the orphanage or donor
    if (user.uid !== orphanageId && user.uid !== donorId) {
      console.error("User is neither orphanage nor donor:", {
        userId: user.uid,
        orphanageId,
        donorId,
      })
      throw new Error("You can only create chats where you are a participant")
    }

    // Check if a chat already exists between these users
    const chatsRef = collection(firestore, "chats")

    // Use a simpler query first to avoid composite index requirements
    const q = query(chatsRef, where(`participants.${orphanageId}`, "==", true))

    try {
      const querySnapshot = await getDocs(q)
      console.log(`Found ${querySnapshot.docs.length} chats with orphanageId: ${orphanageId}`)

      // Then filter the results in JavaScript
      const existingChat = querySnapshot.docs.find((doc) => {
        const data = doc.data()
        return data.participants && data.participants[donorId] === true
      })

      // If chat exists, return it
      if (existingChat) {
        console.log("Found existing chat:", existingChat.id)
        return { id: existingChat.id, ...existingChat.data() }
      }
    } catch (queryError) {
      console.error("Error querying for existing chats:", queryError)
      // Continue to create a new chat
    }

    console.log("No existing chat found, creating new chat")

    // If no chat exists, create a new one
    // First, get user details for both participants
    let orphanageData = {}
    let donorData = {}

    try {
      const orphanageDoc = await getDoc(doc(firestore, "users", orphanageId))
      if (orphanageDoc.exists()) {
        orphanageData = orphanageDoc.data()
      } else {
        console.warn("Orphanage user not found:", orphanageId)
      }
    } catch (error) {
      console.error("Error fetching orphanage data:", error)
    }

    try {
      const donorDoc = await getDoc(doc(firestore, "users", donorId))
      if (donorDoc.exists()) {
        donorData = donorDoc.data()
      } else {
        console.warn("Donor user not found:", donorId)
      }
    } catch (error) {
      console.error("Error fetching donor data:", error)
    }

    // Create a new chat document with participants as a map with keys
    const chatId = uuidv4()
    console.log("Creating new chat with ID:", chatId)

    const chatData = {
      participants: {
        [orphanageId]: true,
        [donorId]: true,
      },
      participantDetails: {
        [orphanageId]: {
          name: orphanageData.name || orphanageData.fullName || "Unknown Orphanage",
          type: "ORPHANAGE",
          photoURL: orphanageData.photoURL || null,
        },
        [donorId]: {
          name: donorData.name || donorData.fullName || "Unknown Donor",
          type: "DONOR",
          photoURL: donorData.photoURL || null,
        },
      },
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: serverTimestamp(),
      createdBy: user.uid,
    }

    try {
      // Use setDoc with merge option to ensure we don't overwrite existing data
      await setDoc(doc(firestore, "chats", chatId), chatData)
      console.log("Chat created successfully")
      return { id: chatId, ...chatData }
    } catch (createError) {
      console.error("Error creating chat document:", createError)
      throw new Error("Failed to create chat: " + createError.message)
    }
  } catch (error) {
    console.error("Error getting or creating chat:", error)
    throw error
  }
}

// Send a message in a chat
export const sendMessage = async (chatId, message, attachmentFile = null) => {
  try {
    console.log("sendMessage called with:", { chatId, message, hasAttachment: !!attachmentFile })

    const user = auth.currentUser
    if (!user) throw new Error("You must be logged in to send messages")

    // Verify the user is a participant in this chat
    const chatDoc = await getDoc(doc(firestore, "chats", chatId))
    if (!chatDoc.exists()) {
      console.error("Chat not found:", chatId)
      throw new Error("Chat not found")
    }

    const chatData = chatDoc.data()
    if (!chatData.participants || !chatData.participants[user.uid]) {
      console.error("User is not a participant in this chat:", user.uid)
      throw new Error("You are not a participant in this chat")
    }

    let attachmentURL = null
    let attachmentType = null
    let attachmentName = null

    // If there's an attachment, upload it to Firebase Storage
    if (attachmentFile) {
      console.log("Uploading attachment:", attachmentFile.name)
      const fileRef = storageRef(storage, `chat-attachments/${chatId}/${uuidv4()}-${attachmentFile.name}`)
      await uploadBytes(fileRef, attachmentFile)
      attachmentURL = await getDownloadURL(fileRef)
      attachmentType = attachmentFile.type
      attachmentName = attachmentFile.name
      console.log("Attachment uploaded successfully")
    }

    // Create the message object
    const messageData = {
      senderId: user.uid,
      text: message,
      timestamp: serverTimestamp(),
      read: false,
      attachmentURL,
      attachmentType,
      attachmentName,
    }

    console.log("Adding message to chat:", chatId)
    // Add message to the chat's messages subcollection
    const messageRef = await addDoc(collection(firestore, "chats", chatId, "messages"), messageData)
    console.log("Message added successfully:", messageRef.id)

    // Update the chat document with the last message
    await updateDoc(doc(firestore, "chats", chatId), {
      lastMessage: message,
      lastMessageTime: serverTimestamp(),
    })
    console.log("Chat updated with last message")

    return { id: messageRef.id, ...messageData }
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}

// Get messages for a specific chat
export const getMessages = (chatId, callback) => {
  try {
    console.log("getMessages called for chat:", chatId)

    if (!chatId) {
      console.error("No chatId provided")
      callback([])
      return () => {}
    }

    const user = auth.currentUser
    if (!user) {
      console.error("User not authenticated")
      callback([])
      return () => {}
    }

    // First verify the user is a participant in this chat
    const unsubscribeChat = onSnapshot(
      doc(firestore, "chats", chatId),
      (chatDoc) => {
        if (!chatDoc.exists()) {
          console.error("Chat not found:", chatId)
          callback([])
          return
        }

        const chatData = chatDoc.data()
        if (!chatData.participants || !chatData.participants[user.uid]) {
          console.error("User is not a participant in this chat:", user.uid)
          callback([])
          return
        }

        console.log("User is a participant, fetching messages")
        // Now that we've verified participation, get the messages
        const messagesRef = collection(firestore, "chats", chatId, "messages")
        const q = query(messagesRef, orderBy("timestamp", "asc"))

        const unsubscribeMessages = onSnapshot(
          q,
          (snapshot) => {
            const messages = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            console.log(`Fetched ${messages.length} messages`)
            callback(messages)
          },
          (error) => {
            console.error("Error getting messages:", error)
            callback([])
          },
        )

        // Store the messages unsubscribe function
        unsubscribeMessagesRef = unsubscribeMessages
      },
      (error) => {
        console.error("Error verifying chat participation:", error)
        callback([])
      },
    )

    let unsubscribeMessagesRef = null

    // Return a function that unsubscribes from both listeners
    return () => {
      if (typeof unsubscribeChat === "function") unsubscribeChat()
      if (typeof unsubscribeMessagesRef === "function") unsubscribeMessagesRef()
    }
  } catch (error) {
    console.error("Error setting up messages listener:", error)
    callback([])
    return () => {}
  }
}

// Mark messages as read
export const markMessagesAsRead = async (chatId, currentUserId) => {
  try {
    console.log("markMessagesAsRead called for chat:", chatId)

    if (!chatId || !currentUserId) {
      console.error("chatId and currentUserId are required")
      return
    }

    const user = auth.currentUser
    if (!user) {
      console.error("User not authenticated")
      return
    }

    // Verify the user is a participant in this chat
    const chatDoc = await getDoc(doc(firestore, "chats", chatId))
    if (!chatDoc.exists()) {
      console.error("Chat not found:", chatId)
      return
    }

    const chatData = chatDoc.data()
    if (!chatData.participants || !chatData.participants[user.uid]) {
      console.error("User is not a participant in this chat:", user.uid)
      return
    }

    console.log("Finding unread messages")
    const messagesRef = collection(firestore, "chats", chatId, "messages")
    const q = query(messagesRef, where("senderId", "!=", currentUserId), where("read", "==", false))

    const querySnapshot = await getDocs(q)
    console.log(`Found ${querySnapshot.docs.length} unread messages`)

    // Use individual updates instead of batch to avoid potential permission issues
    const updatePromises = []
    querySnapshot.docs.forEach((docSnapshot) => {
      updatePromises.push(updateDoc(docSnapshot.ref, { read: true }))
    })

    // Wait for all updates to complete
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
      console.log("All messages marked as read")
    }
  } catch (error) {
    console.error("Error marking messages as read:", error)
  }
}

// Get all chats for the current user
export const getUserChats = (callback) => {
  console.log("getUserChats called")

  const user = auth.currentUser
  if (!user) {
    console.error("User not authenticated")
    callback([])
    return () => {}
  }

  try {
    console.log("Fetching chats for user:", user.uid)
    const chatsRef = collection(firestore, "chats")
    // Use a simpler query without orderBy to avoid composite index requirements
    const q = query(chatsRef, where(`participants.${user.uid}`, "==", true))

    return onSnapshot(
      q,
      (snapshot) => {
        console.log(`Fetched ${snapshot.docs.length} chats`)
        // Sort the chats in JavaScript instead of in the query
        const chats = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => {
            // Sort by lastMessageTime if available
            if (a.lastMessageTime && b.lastMessageTime) {
              return b.lastMessageTime.seconds - a.lastMessageTime.seconds
            }
            // Fallback sort by createdAt
            if (a.createdAt && b.createdAt) {
              return b.createdAt.seconds - a.createdAt.seconds
            }
            return 0
          })

        callback(chats)
      },
      (error) => {
        console.error("Error getting user chats:", error)
        callback([])
      },
    )
  } catch (error) {
    console.error("Error setting up chats listener:", error)
    callback([])
    return () => {}
  }
}

// Get unread message count for a specific chat
export const getUnreadCount = (chatId, callback) => {
  const user = auth.currentUser
  if (!user || !chatId) {
    callback(0)
    return () => {}
  }

  try {
    const messagesRef = collection(firestore, "chats", chatId, "messages")
    const q = query(messagesRef, where("senderId", "!=", user.uid), where("read", "==", false))

    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.length)
      },
      (error) => {
        console.error("Error getting unread count:", error)
        callback(0)
      },
    )
  } catch (error) {
    console.error("Error setting up unread count listener:", error)
    callback(0)
    return () => {}
  }
}

// Get total unread messages across all chats
export const getTotalUnreadMessages = (callback) => {
  const user = auth.currentUser
  if (!user) {
    callback(0)
    return () => {}
  }

  try {
    // First get all chats the user is part of
    const chatsRef = collection(firestore, "chats")
    const chatsQuery = query(chatsRef, where(`participants.${user.uid}`, "==", true))

    return onSnapshot(
      chatsQuery,
      async (chatsSnapshot) => {
        let totalUnread = 0

        // For each chat, count unread messages
        const chatIds = chatsSnapshot.docs.map((doc) => doc.id)

        for (const chatId of chatIds) {
          try {
            const messagesRef = collection(firestore, "chats", chatId, "messages")
            const messagesQuery = query(messagesRef, where("senderId", "!=", user.uid), where("read", "==", false))

            const messagesSnapshot = await getDocs(messagesQuery)
            totalUnread += messagesSnapshot.docs.length
          } catch (error) {
            console.error(`Error counting unread messages for chat ${chatId}:`, error)
            // Continue with other chats even if one fails
          }
        }

        callback(totalUnread)
      },
      (error) => {
        console.error("Error getting total unread count:", error)
        callback(0)
      },
    )
  } catch (error) {
    console.error("Error setting up total unread count listener:", error)
    callback(0)
    return () => {}
  }
}
