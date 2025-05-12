"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"
import { getUserChats, getUnreadCount } from "@/lib/chat-service"
import { formatDistanceToNow } from "date-fns"
import { AlertCircle } from "lucide-react"

export default function ChatSidebar({ activeChatId, setActiveChatId }) {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unreadCounts, setUnreadCounts] = useState({})
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const user = auth.currentUser
    if (!user) {
      setError("You must be logged in to view chats")
      setLoading(false)
      return () => {}
    }

    setLoading(true)
    setError("")

    // Get all chats for the current user
    const unsubscribe = getUserChats((chatsList) => {
      setChats(chatsList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // Set up listeners for unread message counts
    const unsubscribers = chats.map((chat) => {
      return getUnreadCount(chat.id, (count) => {
        setUnreadCounts((prev) => ({
          ...prev,
          [chat.id]: count,
        }))
      })
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [chats])

  // Filter chats based on search term
  const filteredChats = chats.filter((chat) => {
    const currentUser = auth.currentUser
    if (!currentUser) return false

    // Get the other participant's details
    const otherParticipantId = Object.keys(chat.participants || {}).find((id) => id !== currentUser.uid)

    if (!otherParticipantId || !chat.participantDetails || !chat.participantDetails[otherParticipantId]) return false

    const otherParticipantName = chat.participantDetails[otherParticipantId].name || ""

    return otherParticipantName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleChatClick = (chatId) => {
    setActiveChatId(chatId)
  }

  if (loading) {
    return (
      <div className="w-full md:w-80 border-r border-gray-200 p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full md:w-80 border-r border-gray-200 p-4">
        <div className="flex items-center text-red-500 mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? "No conversations match your search" : "No conversations yet"}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const currentUser = auth.currentUser
            if (!currentUser) return null

            // Get the other participant's details
            const otherParticipantId = Object.keys(chat.participants || {}).find((id) => id !== currentUser.uid)

            if (!otherParticipantId || !chat.participantDetails || !chat.participantDetails[otherParticipantId]) {
              return (
                <div key={chat.id} className="p-4 border-b border-gray-200">
                  <p className="text-gray-500">Unknown participant</p>
                </div>
              )
            }

            const otherParticipant = chat.participantDetails[otherParticipantId]
            const unreadCount = unreadCounts[chat.id] || 0

            return (
              <div
                key={chat.id}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 ${
                  activeChatId === chat.id ? "bg-gray-100" : ""
                }`}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                    {otherParticipant.name ? otherParticipant.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{otherParticipant.name || "Unknown User"}</h3>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(
                            typeof chat.lastMessageTime.toDate === "function"
                              ? chat.lastMessageTime.toDate()
                              : new Date(chat.lastMessageTime),
                            { addSuffix: true },
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage || "No messages yet"}</p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="ml-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      {unreadCount}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
