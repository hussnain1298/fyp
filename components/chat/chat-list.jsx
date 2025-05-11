"use client"
import { useChat } from "./chat-context"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, User } from "lucide-react"
import { useState, useEffect } from "react"

const ChatList = () => {
  const { chats, selectChat, currentChat, currentUser, loading } = useChat()
  const [error, setError] = useState(null)

  // Reset error when chats change
  useEffect(() => {
    setError(null)
  }, [chats])

  if (loading) {
    return (
      <div className="flex flex-col h-full p-4 border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Chats</h2>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full p-4 border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Chats</h2>
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <p>Error loading chats</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col h-full p-4 border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Chats</h2>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <MessageSquare className="h-12 w-12 mb-2" />
          <p>No chats yet</p>
          <p className="text-sm text-center mt-2">Start a conversation from a donor or orphanage profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      <h2 className="text-xl font-semibold p-4 border-b border-gray-200">Chats</h2>
      <div className="overflow-y-auto flex-grow">
        {chats.map((chat) => {
          try {
            // Find the other participant (not the current user)
            const otherParticipantId = chat.participants.find((id) => id !== currentUser?.uid)
            const otherParticipantName =
              otherParticipantId && chat.participantNames
                ? chat.participantNames[otherParticipantId] || "Unknown User"
                : "Unknown User"

            // Format the timestamp
            const timestamp = chat.lastMessage?.timestamp?.toDate() || chat.createdAt?.toDate()
            const timeAgo = timestamp ? formatDistanceToNow(timestamp, { addSuffix: true }) : ""

            return (
              <div
                key={chat.id}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentChat?.id === chat.id ? "bg-green-50" : ""
                }`}
                onClick={() => selectChat(chat.id)}
              >
                <div className="flex items-center">
                  <div className="bg-gray-200 rounded-full p-2 mr-3">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{otherParticipantName}</h3>
                      <span className="text-xs text-gray-500">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage?.text || "Start a conversation"}</p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="ml-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            )
          } catch (err) {
            console.error("Error rendering chat item:", err)
            return null // Skip rendering this chat item if there's an error
          }
        })}
      </div>
    </div>
  )
}

export default ChatList
