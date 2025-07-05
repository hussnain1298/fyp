"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { firestore, auth } from "@/lib/firebase"
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore"

const generateColor = (name) => {
  if (!name) return "#6B7280"
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (name) => {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const formatTime = (timestamp) => {
  if (!timestamp) return ""
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const formatDate = (timestamp) => {
  if (!timestamp) return ""
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString()
  }
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const chatId = searchParams.get("chatId")
  const donorIdFromParams = searchParams.get("donorId")
  const orphanageIdFromParams = searchParams.get("orphanageId")

  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [userType, setUserType] = useState(null)
  const [orphanageId, setOrphanageId] = useState(orphanageIdFromParams)
  const [donorId, setDonorId] = useState(donorIdFromParams)
  const [orphanageProfile, setOrphanageProfile] = useState(null)
  const [donorProfile, setDonorProfile] = useState(null)
  const [profilesCache, setProfilesCache] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setUserType(data.userType)
            if (data.userType === "Orphanage") setOrphanageId(currentUser.uid)
            if (data.userType === "Donor") setDonorId(currentUser.uid)

            if (!chatId && donorIdFromParams && orphanageIdFromParams) {
              const newChatId = `${donorIdFromParams}_${orphanageIdFromParams}`
              const existing = await getDoc(doc(firestore, "chats", newChatId))
              if (!existing.exists()) {
                await setDoc(doc(firestore, "chats", newChatId), {
                  donorId: donorIdFromParams,
                  orphanageId: orphanageIdFromParams,
                  participants: [donorIdFromParams, orphanageIdFromParams],
                  createdAt: serverTimestamp(),
                  lastMessage: null,
                  lastMessageTime: serverTimestamp(),
                })
              }
              router.replace(`/chat?chatId=${newChatId}`)
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      setLoading(false)
    })
    return unsub
  }, [chatId, donorIdFromParams, orphanageIdFromParams, router])

  useEffect(() => {
    if (!chatId) return
    const fetchChat = async () => {
      try {
        const chatDoc = await getDoc(doc(firestore, "chats", chatId))
        if (chatDoc.exists()) {
          const data = chatDoc.data()
          setOrphanageId(data.orphanageId)
          setDonorId(data.donorId || data.participants?.find((p) => p !== data.orphanageId))
        }
      } catch (error) {
        console.error("Error fetching chat:", error)
      }
    }
    fetchChat()
  }, [chatId])

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        if (orphanageId) {
          const docRef = await getDoc(doc(firestore, "users", orphanageId))
          setOrphanageProfile(docRef.exists() ? docRef.data() : null)
        }
        if (donorId) {
          const docRef = await getDoc(doc(firestore, "users", donorId))
          setDonorProfile(docRef.exists() ? docRef.data() : null)
        }
      } catch (error) {
        console.error("Error fetching profiles:", error)
      }
    }
    fetchProfiles()
  }, [orphanageId, donorId])

  useEffect(() => {
    if (!chatId) return
    const q = query(collection(firestore, "chats", chatId, "messages"), orderBy("timestamp", "asc"))
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setMessages(msgs)
    })
    return () => unsub()
  }, [chatId])

  useEffect(() => {
    messages.forEach(async (m) => {
      if (!profilesCache[m.senderId]) {
        try {
          const d = await getDoc(doc(firestore, "users", m.senderId))
          setProfilesCache((prev) => ({
            ...prev,
            [m.senderId]: d.exists() ? d.data() : null,
          }))
        } catch (error) {
          console.error("Error fetching profile:", error)
        }
      }
    })
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, profilesCache])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    setIsTyping(false)

    try {
      await addDoc(collection(firestore, "chats", chatId, "messages"), {
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      })

      // Update chat with last message info
      await setDoc(
        doc(firestore, "chats", chatId),
        {
          lastMessage: newMessage.trim(),
          lastMessageTime: serverTimestamp(),
          lastMessageSender: user.uid,
        },
        { merge: true },
      )

      setNewMessage("")
      inputRef.current?.focus()
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    setIsTyping(e.target.value.length > 0)
  }

  const groupedMessages = useMemo(() => {
    const groups = []
    let currentGroup = null

    messages.forEach((message, index) => {
      const messageDate = formatDate(message.timestamp)
      const isNewDay = !currentGroup || currentGroup.date !== messageDate

      if (isNewDay) {
        currentGroup = {
          date: messageDate,
          messages: [message],
        }
        groups.push(currentGroup)
      } else {
        currentGroup.messages.push(message)
      }
    })

    return groups
  }, [messages])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access chat</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const otherProfile = userType === "Donor" ? orphanageProfile : donorProfile
  const otherName = otherProfile?.orgName || otherProfile?.fullName || otherProfile?.name || "Unknown User"

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                style={{ backgroundColor: generateColor(otherName) }}
              >
                {getInitials(otherName)}
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">{otherName}</h1>
                <p className="text-sm text-gray-500">{userType === "Donor" ? "Orphanage" : "Donor"}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-500">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
            <p className="text-gray-500 max-w-sm">Send a message to begin your conversation with {otherName}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date separator */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{group.date}</div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-4">
                  {group.messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.uid
                    const profile = profilesCache[msg.senderId]
                    const senderName = profile?.orgName || profile?.fullName || profile?.name || "Unknown"
                    const showAvatar = index === 0 || group.messages[index - 1]?.senderId !== msg.senderId

                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${
                            isMe ? "flex-row-reverse space-x-reverse" : ""
                          }`}
                        >
                          {showAvatar ? (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: generateColor(senderName) }}
                            >
                              {getInitials(senderName)}
                            </div>
                          ) : (
                            <div className="w-8" />
                          )}
                          <div className="flex flex-col">
                            <div
                              className={`px-4 py-2 rounded-2xl shadow-sm ${
                                isMe
                                  ? "bg-blue-600 text-white rounded-br-md"
                                  : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                            </div>
                            <span className={`text-xs text-gray-500 mt-1 ${isMe ? "text-right" : "text-left"}`}>
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              rows={1}
              style={{ minHeight: "44px", maxHeight: "120px" }}
              disabled={sending}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
