"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "./chat-context"
import { Send, ArrowLeft, MessageSquare, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const ChatInterface = () => {
  const { currentChat, messages, sendMessage, selectChat, currentUser } = useChat()
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (newMessage.trim()) {
      sendMessage(newMessage)
      setNewMessage("")
    }
  }

  if (!currentChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
        <div className="text-center">
          <div className="bg-gray-200 p-6 rounded-full inline-block mb-4">
            <MessageSquare className="h-12 w-12 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">Your Messages</h3>
          <p className="text-gray-500 max-w-md">
            Select a chat from the sidebar or start a new conversation with a donor or orphanage.
          </p>
        </div>
      </div>
    )
  }

  // Find the other participant (not the current user)
  const otherParticipantId = currentChat.participants.find((id) => id !== currentUser?.uid)
  const otherParticipantName = otherParticipantId ? currentChat.participantNames[otherParticipantId] : "Unknown User"

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 flex items-center">
        {isMobile && (
          <button onClick={() => selectChat(null)} className="mr-2 p-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="bg-gray-200 rounded-full p-2 mr-3">
          <User className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h3 className="font-medium">{otherParticipantName}</h3>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUser?.uid
            const timestamp = message.timestamp?.toDate()
            const timeAgo = timestamp ? formatDistanceToNow(timestamp, { addSuffix: true }) : ""

            return (
              <div key={message.id} className={`mb-4 flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    isCurrentUser
                      ? "bg-green-500 text-white rounded-br-none"
                      : "bg-white border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p>{message.text}</p>
                  <div className={`text-xs mt-1 ${isCurrentUser ? "text-green-100" : "text-gray-500"}`}>
                    {isCurrentUser ? "You" : message.senderName} • {timeAgo}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-green-500 text-white p-2 rounded-r-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatInterface
