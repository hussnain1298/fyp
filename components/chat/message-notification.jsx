"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { useChat } from "./chat-context"

const MessageNotification = ({ className = "" }) => {
  const { chats, currentUser } = useChat()
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  // Calculate total unread messages
  useEffect(() => {
    if (chats && chats.length > 0) {
      const totalUnread = chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0)
      setUnreadCount(totalUnread)
    } else {
      setUnreadCount(0)
    }
  }, [chats])

  const handleClick = () => {
    router.push("/messages")
  }

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors ${className}`}
    >
      <MessageSquare className="h-5 w-5" />
      <span>Messages</span>

      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </button>
  )
}

export default MessageNotification
