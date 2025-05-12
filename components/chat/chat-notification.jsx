"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getTotalUnreadMessages } from "@/lib/chat-service"
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline"

export default function ChatNotification() {
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = getTotalUnreadMessages(setUnreadCount)
    return () => unsubscribe()
  }, [])

  return (
    <button className="relative p-2 text-gray-700 hover:text-green-500" onClick={() => router.push("/chat")}>
      <ChatBubbleLeftRightIcon className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )
}
