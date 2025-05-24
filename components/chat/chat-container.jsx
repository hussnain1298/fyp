"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"
import { getUserChats } from "@/lib/chat-service"
import ChatSidebar from "./chat-sidebar"
import ChatWindow from "./chat-window"

export default function ChatContainer({ userType }) {
  const [activeChatId, setActiveChatId] = useState(null)
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState(null)

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    // Get all chats for the current user
    const unsubscribe = getUserChats((chatsList) => {
      setChats(chatsList)

      // If we have chats and no active chat, select the first one
      if (chatsList.length > 0 && !activeChatId) {
        setActiveChatId(chatsList[0].id)

        // Set the other user for the first chat
        const otherParticipantId = Object.keys(chatsList[0].participants).find((id) => id !== user.uid)

        if (otherParticipantId && chatsList[0].participantDetails[otherParticipantId]) {
          setOtherUser(chatsList[0].participantDetails[otherParticipantId])
        }
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [activeChatId])

  // When active chat changes, update the other user
  useEffect(() => {
    if (!activeChatId || chats.length === 0) return

    const user = auth.currentUser
    if (!user) return

    const activeChat = chats.find((chat) => chat.id === activeChatId)
    if (!activeChat) return

    const otherParticipantId = Object.keys(activeChat.participants).find((id) => id !== user.uid)

    if (otherParticipantId && activeChat.participantDetails[otherParticipantId]) {
      setOtherUser(activeChat.participantDetails[otherParticipantId])
    }
  }, [activeChatId, chats])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: "calc(100vh - 300px)" }}>
      <div className="flex flex-col md:flex-row h-full">
        <ChatSidebar activeChatId={activeChatId} setActiveChatId={setActiveChatId} />
        <ChatWindow chatId={activeChatId} otherUser={otherUser} />
      </div>
    </div>
  )
}
