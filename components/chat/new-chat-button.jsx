"use client"

import { useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import StartChatModal from "./start-chat-modal"

const NewChatButton = ({ userType, className = "" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors ${className}`}
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span>New Chat</span>
      </button>

      {isModalOpen && <StartChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userType={userType} />}
    </>
  )
}

export default NewChatButton
