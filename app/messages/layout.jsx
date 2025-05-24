"use client"

import { ChatProvider } from "@/components/chat/chat-context"
import NewChatButton from "@/components/chat/new-chat-button"

export default function MessagesLayout({ children }) {
  return (
    <ChatProvider>
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Messages</h1>
          <NewChatButton />
        </div>
        {children}
      </div>
    </ChatProvider>
  )
}
