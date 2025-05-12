"use client"

import { useState, useEffect, useRef } from "react"
import { auth } from "@/lib/firebase"
import { getMessages, sendMessage, markMessagesAsRead } from "@/lib/chat-service"
import { formatDistanceToNow } from "date-fns"
import { PaperClipIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline"

export default function ChatWindow({ chatId, otherUser }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (!chatId) return

    // Get messages for this chat
    const unsubscribe = getMessages(chatId, (messagesList) => {
      setMessages(messagesList)

      // Mark messages as read
      if (auth.currentUser) {
        markMessagesAsRead(chatId, auth.currentUser.uid)
      }

      // Scroll to bottom when new messages arrive
      setTimeout(scrollToBottom, 100)
    })

    return () => unsubscribe()
  }, [chatId])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if ((!newMessage.trim() && !attachment) || !chatId) return

    try {
      setSending(true)
      await sendMessage(chatId, newMessage, attachment)
      setNewMessage("")
      setAttachment(null)
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0])
    }
  }

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
        <p className="text-gray-500">Select a conversation to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 flex items-center">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
          {otherUser?.name ? otherUser.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="ml-3">
          <h3 className="font-semibold">{otherUser?.name || "Unknown User"}</h3>
          <p className="text-xs text-gray-500">{otherUser?.type || ""}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === auth.currentUser?.uid

            return (
              <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] ${isCurrentUser ? "bg-green-500 text-white" : "bg-gray-200"} rounded-lg p-3`}
                >
                  {message.text && <p className="break-words">{message.text}</p>}

                  {message.attachmentURL && (
                    <div className="mt-2">
                      {message.attachmentType?.startsWith("image/") ? (
                        <img
                          src={message.attachmentURL || "/placeholder.svg"}
                          alt="Attachment"
                          className="max-w-full rounded"
                        />
                      ) : (
                        <a
                          href={message.attachmentURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline flex items-center"
                        >
                          <PaperClipIcon className="h-4 w-4 mr-1" />
                          Attachment
                        </a>
                      )}
                    </div>
                  )}

                  <div className="text-xs mt-1 text-right">
                    {message.timestamp
                      ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true })
                      : "Sending..."}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        {attachment && (
          <div className="mb-2 p-2 bg-gray-100 rounded flex justify-between items-center">
            <span className="text-sm truncate">{attachment.name}</span>
            <button type="button" className="text-red-500 text-sm" onClick={() => setAttachment(null)}>
              Remove
            </button>
          </div>
        )}

        <div className="flex items-center">
          <button type="button" className="p-2 text-gray-500 hover:text-gray-700" onClick={handleAttachmentClick}>
            <PaperClipIcon className="h-5 w-5" />
          </button>

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />

          <button
            type="submit"
            className="bg-green-500 text-white p-2 rounded-r-md hover:bg-green-600 disabled:bg-green-300"
            disabled={sending || (!newMessage.trim() && !attachment)}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
