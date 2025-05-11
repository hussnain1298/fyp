"use client"

import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { useChat } from "./chat-context"
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"
import { firestore } from "@/lib/firebase"

const ChatButton = ({ userId, requestId, className = "" }) => {
  const router = useRouter()
  const { createNewChat, currentUser } = useChat()
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [chatId, setChatId] = useState(null)

  // Check if there's an existing chat and if it has unread messages
  useEffect(() => {
    if (!currentUser || !userId) return

    const checkExistingChat = async () => {
      try {
        // Query to find chats where both users are participants
        const chatsQuery = query(
          collection(firestore, "chats"),
          where("participants", "array-contains", currentUser.uid),
        )

        const querySnapshot = await getDocs(chatsQuery)

        // Find the chat with the target user
        for (const doc of querySnapshot.docs) {
          const chatData = doc.data()

          // If this chat includes the target user and matches the request ID (if provided)
          if (chatData.participants.includes(userId) && (!requestId || chatData.requestId === requestId)) {
            setChatId(doc.id)

            // Check if there are unread messages for the current user
            const unreadCount = chatData.unreadCount?.[currentUser.uid] || 0
            setHasUnreadMessages(unreadCount > 0)

            // Set up a listener for this chat to update the unread status
            const unsubscribe = onSnapshot(doc.ref, (snapshot) => {
              if (snapshot.exists()) {
                const updatedData = snapshot.data()
                const newUnreadCount = updatedData.unreadCount?.[currentUser.uid] || 0
                setHasUnreadMessages(newUnreadCount > 0)
              }
            })

            return () => unsubscribe()
          }
        }
      } catch (error) {
        console.error("Error checking existing chat:", error)
      }
    }

    checkExistingChat()
  }, [currentUser, userId, requestId])

  const handleStartChat = async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      if (!currentUser) {
        // Redirect to login if not authenticated
        router.push("/login?redirect=chat")
        return
      }

      // Create a chat with the request ID if provided
      const newChatId = await createNewChat(userId, requestId)
      router.push(`/messages?chatId=${newChatId}`)
    } catch (error) {
      console.error("Error starting chat:", error)
      alert("Failed to start chat. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleStartChat}
      disabled={isLoading}
      className={`relative flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`}
    >
      <MessageSquare className="h-5 w-5" />
      <span>{isLoading ? "Loading..." : "Message"}</span>

      {/* Notification indicator */}
      {hasUnreadMessages && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          !
        </div>
      )}
    </button>
  )
}

export default ChatButton
