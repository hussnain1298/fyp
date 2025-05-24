"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import ChatList from "@/components/chat/chat-list"
import ChatInterface from "@/components/chat/chat-interface"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

const MessagesPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatId = searchParams.get("chatId")

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user)

      if (!user) {
        // Redirect to login if not authenticated
        router.push("/login?redirect=messages")
      }
    })

    return unsubscribe
  }, [router])

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // If not authenticated, don't render anything (redirect happens in useEffect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl mt-20">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="grid md:grid-cols-3 h-[calc(100vh-200px)]">
          {/* Chat list (hidden on mobile when a chat is selected) */}
          <div className={`md:block ${chatId ? "hidden" : "block"} md:col-span-1`}>
            <ChatList />
          </div>

          {/* Chat interface (full width on mobile when a chat is selected) */}
          <div className={`${chatId ? "block" : "hidden"} md:block md:col-span-2`}>
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessagesPage
