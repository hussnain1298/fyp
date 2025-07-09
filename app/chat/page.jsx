"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { firestore, auth } from "@/lib/firebase"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  limit,
  startAfter,
  getDocs,
  writeBatch,
} from "firebase/firestore"
import { Send, ArrowLeft, User, Building, Shield, MoreVertical, Phone, Video, Info } from "lucide-react"

const formatTime = (date) => {
  if (!date) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const formatDate = (date) => {
  if (!date) return ""
  const today = new Date()
  const messageDate = new Date(date)

  if (messageDate.toDateString() === today.toDateString()) {
    return "Today"
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  }

  return messageDate.toLocaleDateString()
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

const generateColor = (name, userType) => {
  if (!name) return "#6B7280"

  const colorSchemes = {
    Donor: ["#3B82F6", "#1D4ED8", "#2563EB", "#1E40AF"],
    Orphanage: ["#10B981", "#059669", "#047857", "#065F46"],
    admin: ["#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6"],
  }

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = colorSchemes[userType] || colorSchemes.admin
  return colors[Math.abs(hash) % colors.length]
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const chatId = searchParams.get("chatId")
  const isAdminChat = searchParams.get("isAdmin") === "true"

  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [chatInfo, setChatInfo] = useState(null)
  const [otherUserProfile, setOtherUserProfile] = useState(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastVisible, setLastVisible] = useState(null)
  const [initialLoad, setInitialLoad] = useState(true)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const previousScrollHeight = useRef(0)
  const isLoadingMoreRef = useRef(false)

  // Cache for better performance
  const profileCache = useMemo(() => new Map(), [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (initialLoad || messages.length === 0) {
      setTimeout(() => scrollToBottom(), 100)
      setInitialLoad(false)
    } else {
      const container = messagesContainerRef.current
      if (container) {
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100
        if (isAtBottom) {
          setTimeout(() => scrollToBottom(), 100)
        }
      }
    }
  }, [messages, scrollToBottom, initialLoad])

  // Authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data())
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setError("Failed to load user profile.")
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Fetch chat info and other user profile
  useEffect(() => {
    if (!user || !chatId) return

    const fetchChatInfo = async () => {
      try {
        const collectionName = isAdminChat ? "adminChats" : "chats"
        const chatDoc = await getDoc(doc(firestore, collectionName, chatId))

        if (chatDoc.exists()) {
          const chatData = chatDoc.data()
          setChatInfo(chatData)

          // Determine other user ID
          let otherUserId
          if (isAdminChat) {
            otherUserId = chatData.adminId === user.uid ? chatData.userId : chatData.adminId
          } else {
            otherUserId = chatData.participants?.find((id) => id !== user.uid)
          }

          if (otherUserId) {
            // Check cache first
            if (profileCache.has(otherUserId)) {
              setOtherUserProfile(profileCache.get(otherUserId))
            } else {
              const otherUserDoc = await getDoc(doc(firestore, "users", otherUserId))
              if (otherUserDoc.exists()) {
                const profile = otherUserDoc.data()
                profileCache.set(otherUserId, profile)
                setOtherUserProfile(profile)
              }
            }
          }
        } else {
          setError("Chat not found.")
        }
      } catch (error) {
        console.error("Error fetching chat info:", error)
        setError("Failed to load chat information.")
      }
    }

    fetchChatInfo()
  }, [user, chatId, isAdminChat, profileCache])

  // Load initial messages with improved pagination
  const loadMessages = useCallback(
    async (loadMore = false) => {
      if (!chatId || !user || isLoadingMoreRef.current) return

      try {
        if (loadMore) {
          setLoadingMore(true)
          isLoadingMoreRef.current = true
        }

        const collectionName = isAdminChat ? "adminChats" : "chats"
        let messagesQuery = query(
          collection(firestore, collectionName, chatId, "messages"),
          orderBy("timestamp", "desc"),
          limit(25),
        )

        if (loadMore && lastVisible) {
          messagesQuery = query(
            collection(firestore, collectionName, chatId, "messages"),
            orderBy("timestamp", "desc"),
            startAfter(lastVisible),
            limit(25),
          )
        }

        const snapshot = await getDocs(messagesQuery)

        if (snapshot.empty) {
          setHasMoreMessages(false)
          if (loadMore) {
            setLoadingMore(false)
            isLoadingMoreRef.current = false
          }
          return
        }

        const newMessages = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }))
          .reverse()

        if (loadMore) {
          const container = messagesContainerRef.current
          if (container) {
            previousScrollHeight.current = container.scrollHeight
          }

          setMessages((prev) => [...newMessages, ...prev])
        } else {
          setMessages(newMessages)
          // Mark messages as read when initially loading
          markMessagesAsRead(newMessages)
        }

        setLastVisible(snapshot.docs[snapshot.docs.length - 1])
        setHasMoreMessages(snapshot.docs.length === 25)

        if (loadMore) {
          // Maintain scroll position after loading more messages
          setTimeout(() => {
            const container = messagesContainerRef.current
            if (container) {
              const newScrollHeight = container.scrollHeight
              const scrollDifference = newScrollHeight - previousScrollHeight.current
              container.scrollTop = scrollDifference + 50 // Add small offset
            }
            setLoadingMore(false)
            isLoadingMoreRef.current = false
          }, 100)
        }
      } catch (error) {
        console.error("Error loading messages:", error)
        setError("Failed to load messages.")
        if (loadMore) {
          setLoadingMore(false)
          isLoadingMoreRef.current = false
        }
      }
    },
    [chatId, user, isAdminChat, lastVisible],
  )

  // Mark messages as read
  const markMessagesAsRead = useCallback(
    async (messagesToMark) => {
      if (!user || !chatId) return

      try {
        const collectionName = isAdminChat ? "adminChats" : "chats"
        const batch = writeBatch(firestore)

        const unreadMessages = messagesToMark.filter((msg) => msg.senderId !== user.uid && !msg.read)

        unreadMessages.forEach((msg) => {
          const messageRef = doc(firestore, collectionName, chatId, "messages", msg.id)
          batch.update(messageRef, {
            read: true,
            readAt: serverTimestamp(),
          })
        })

        if (unreadMessages.length > 0) {
          await batch.commit()
        }
      } catch (error) {
        console.error("Error marking messages as read:", error)
      }
    },
    [user, chatId, isAdminChat],
  )

  // Initial message load
  useEffect(() => {
    if (user && chatId) {
      loadMessages()
    }
  }, [user, chatId, loadMessages])

  // Real-time message listener for new messages only
  useEffect(() => {
    if (!user || !chatId) return

    const collectionName = isAdminChat ? "adminChats" : "chats"

    // Listen only for new messages (last 1 message)
    const messagesQuery = query(
      collection(firestore, collectionName, chatId, "messages"),
      orderBy("timestamp", "desc"),
      limit(1),
    )

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newMessage = {
              id: change.doc.id,
              ...change.doc.data(),
              timestamp: change.doc.data().timestamp?.toDate() || new Date(),
            }

            // Only add if it's not already in our messages array
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMessage.id)
              if (!exists) {
                // Mark as read if it's not from current user
                if (newMessage.senderId !== user.uid) {
                  markMessagesAsRead([newMessage])
                }
                return [...prev, newMessage]
              }
              return prev
            })
          }
        })
      },
      (error) => {
        console.error("Error in messages listener:", error)
      },
    )

    return () => unsubscribe()
  }, [user, chatId, isAdminChat, markMessagesAsRead])

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !user) return

    setSending(true)
    const messageText = newMessage.trim()
    setNewMessage("")

    try {
      const collectionName = isAdminChat ? "adminChats" : "chats"

      // Add message to subcollection
      await addDoc(collection(firestore, collectionName, chatId, "messages"), {
        text: messageText,
        senderId: user.uid,
        senderName: userProfile?.fullName || userProfile?.orgName || "Unknown",
        timestamp: serverTimestamp(),
        read: false,
      })

      // Update chat's last message
      await updateDoc(doc(firestore, collectionName, chatId), {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
      })

      // Focus back to input
      inputRef.current?.focus()
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
      setNewMessage(messageText) // Restore message text
    } finally {
      setSending(false)
    }
  }

  // Improved scroll handling for loading more messages
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container || isLoadingMoreRef.current) return

    // Check if scrolled to top (with small threshold)
    if (container.scrollTop <= 50 && hasMoreMessages && !loadingMore) {
      loadMessages(true)
    }
  }, [hasMoreMessages, loadingMore, loadMessages])

  // Get display name for other user
  const getDisplayName = () => {
    if (!otherUserProfile) return "Loading..."

    if (isAdminChat) {
      return userProfile?.userType === "admin"
        ? otherUserProfile.fullName || otherUserProfile.orgName || "User"
        : "Admin Support"
    }

    return otherUserProfile.fullName || otherUserProfile.orgName || "User"
  }

  // Get user type icon
  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case "Donor":
        return <User className="w-4 h-4" />
      case "Orphanage":
        return <Building className="w-4 h-4" />
      case "admin":
        return <Shield className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = {}
    messages.forEach((message) => {
      const dateKey = formatDate(message.timestamp)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    return groups
  }, [messages])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
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

  if (!chatId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Chat</h2>
          <p className="text-gray-600 mb-4">Chat ID is missing</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                style={{
                  backgroundColor: generateColor(
                    getDisplayName(),
                    isAdminChat
                      ? userProfile?.userType === "admin"
                        ? otherUserProfile?.userType
                        : "admin"
                      : otherUserProfile?.userType,
                  ),
                }}
              >
                {isAdminChat && userProfile?.userType !== "admin" ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  getInitials(getDisplayName())
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-gray-900">{getDisplayName()}</h1>
                  {otherUserProfile && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        isAdminChat && userProfile?.userType !== "admin"
                          ? "bg-purple-100 text-purple-700"
                          : otherUserProfile.userType === "Donor"
                            ? "bg-blue-100 text-blue-700"
                            : otherUserProfile.userType === "Orphanage"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {getUserTypeIcon(
                        isAdminChat && userProfile?.userType !== "admin" ? "admin" : otherUserProfile.userType,
                      )}
                      {isAdminChat && userProfile?.userType !== "admin" ? "Admin" : otherUserProfile.userType}
                    </span>
                  )}
                </div>
                <p className="text-sm text-green-600">Online</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Video className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Info className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed top-16 left-4 right-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm z-40">
          {error}
        </div>
      )}

      {/* Messages Container with top padding for fixed header */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 mt-16 mb-20"
        onScroll={handleScroll}
        style={{
          scrollBehavior: "auto",
          paddingTop: error ? "4rem" : "1rem",
        }}
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="text-center py-4 sticky top-0 bg-gray-50 z-30">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white shadow-sm border text-gray-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
              Loading more messages...
            </div>
          </div>
        )}

        {/* Messages grouped by date */}
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-6">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">{date}</div>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message, index) => {
              const isOwnMessage = message.senderId === user.uid
              const showAvatar = index === 0 || dateMessages[index - 1].senderId !== message.senderId

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-1"}`}
                >
                  <div
                    className={`flex ${isOwnMessage ? "flex-row-reverse" : "flex-row"} items-end space-x-2 max-w-xs sm:max-w-md`}
                  >
                    {/* Avatar */}
                    {showAvatar && !isOwnMessage && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                        style={{
                          backgroundColor: generateColor(
                            message.senderName,
                            isAdminChat
                              ? message.senderId === chatInfo?.adminId
                                ? "admin"
                                : otherUserProfile?.userType
                              : otherUserProfile?.userType,
                          ),
                        }}
                      >
                        {isAdminChat && message.senderId === chatInfo?.adminId ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          getInitials(message.senderName)
                        )}
                      </div>
                    )}

                    {!showAvatar && !isOwnMessage && <div className="w-8" />}

                    {/* Message bubble */}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                      } shadow-sm`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? "text-blue-100" : "text-gray-500"}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {messages.length === 0 && !loadingMore && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500">Start the conversation by sending a message below</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Message Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
        <form onSubmit={sendMessage} className="flex items-center space-x-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
