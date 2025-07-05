"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, limit, orderBy as orderByFB } from "firebase/firestore"
import { useRouter } from "next/navigation"

const formatRelativeTime = (date) => {
  if (!date) return "Unknown"
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)} seconds ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return `${Math.floor(diff / 86400)} days ago`
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

const generateColor = (name) => {
  if (!name) return "#6B7280"
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]
  return colors[Math.abs(hash) % colors.length]
}

export default function OrphanageMessages() {
  const [user, setUser] = useState(null)
  const [chats, setChats] = useState([])
  const [donorProfiles, setDonorProfiles] = useState({})
  const [search, setSearch] = useState("")
  const [donorSearchResult, setDonorSearchResult] = useState(null)
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const fetchChats = useCallback(async () => {
    if (!user) return

    setLoadingChats(true)
    setError("")

    try {
      const chatsRef = collection(firestore, "chats")
      const chatsQuery = query(chatsRef, where("participants", "array-contains", user.uid))
      const snapshot = await getDocs(chatsQuery)

      const enrichedChats = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const chatData = docSnap.data()
          const chatId = docSnap.id
          const donorId = chatData.donorId || chatData.participants.find((p) => p !== user.uid)

          let lastMessage = null
          let lastTimestamp = null

          try {
            const messagesQuery = query(
              collection(firestore, "chats", chatId, "messages"),
              orderByFB("timestamp", "desc"),
              limit(1),
            )
            const messagesSnap = await getDocs(messagesQuery)
            if (!messagesSnap.empty) {
              const msg = messagesSnap.docs[0].data()
              lastMessage = msg.text || ""
              lastTimestamp = msg.timestamp?.toDate() || null
            }
          } catch (e) {
            console.error("Error fetching last message", e)
          }

          return {
            id: chatId,
            ...chatData,
            donorId,
            lastMessage,
            lastTimestamp,
          }
        }),
      )

      setChats(enrichedChats)
    } catch (error) {
      console.error("Error fetching chats:", error)
      setError("Failed to load conversations. Please try again.")
    } finally {
      setLoadingChats(false)
    }
  }, [user])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  const fetchDonorProfiles = useCallback(async (donorIds) => {
    const updates = {}
    for (const id of donorIds) {
      try {
        const docSnap = await getDocs(query(collection(firestore, "users"), where("uid", "==", id)))
        if (!docSnap.empty) {
          const data = docSnap.docs[0].data()
          updates[id] = {
            name: data.fullName || data.orgName || "Unknown Donor",
            profilePhoto: data.profilePhoto || null,
          }
        }
      } catch {
        updates[id] = { name: "Unknown Donor", profilePhoto: null }
      }
    }
    setDonorProfiles((prev) => ({ ...prev, ...updates }))
  }, [])

  useEffect(() => {
    const donorIds = chats.map((chat) => chat.donorId).filter((id) => id && !donorProfiles[id])

    if (donorIds.length > 0) {
      fetchDonorProfiles(donorIds)
    }
  }, [chats, donorProfiles, fetchDonorProfiles])

  const searchDonors = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setDonorSearchResult(null)
      return
    }

    setLoadingSearch(true)
    try {
      const donorsQuery = query(collection(firestore, "users"), where("userType", "==", "Donor"))
      const snap = await getDocs(donorsQuery)
      const match = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .find((user) => (user.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()))
      setDonorSearchResult(match || null)
    } catch (error) {
      console.error("Error searching donors:", error)
      setError("Failed to search donors. Please try again.")
    } finally {
      setLoadingSearch(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDonors(search)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [search, searchDonors])

  const startChat = async () => {
    if (!user || !donorSearchResult) return

    const existingChat = chats.find((chat) => chat.donorId === donorSearchResult.uid)
    if (existingChat) {
      return router.push(`/chat?chatId=${existingChat.id}`)
    }

    try {
      const chatRef = await addDoc(collection(firestore, "chats"), {
        orphanageId: user.uid,
        donorId: donorSearchResult.uid,
        participants: [user.uid, donorSearchResult.uid],
        createdAt: new Date(),
      })
      router.push(`/chat?chatId=${chatRef.id}`)
    } catch (e) {
      console.error("Failed to start chat:", e)
      setError("Failed to start conversation. Please try again.")
    }
  }

  const openChat = useCallback(
    (chatId) => {
      if (!chatId) return
      router.push(`/chat?chatId=${chatId}`)
    },
    [router],
  )

  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => {
        const profile = donorProfiles[chat.donorId]
        const name = profile?.name?.toLowerCase() || ""
        const matchesSearch = name.includes(search.toLowerCase())
        const hasMessage = !!chat.lastMessage || !!chat.lastTimestamp
        return search ? matchesSearch : hasMessage
      })
      .sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0))
  }, [chats, donorProfiles, search])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Connect and communicate with your donors</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search donors by name to start a conversation..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loadingSearch && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            </div>
          )}
        </div>

        {/* Search Result */}
        {search && donorSearchResult && filteredChats.length === 0 && (
          <div
            className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer hover:bg-green-100 transition-colors"
            onClick={startChat}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: generateColor(donorSearchResult.fullName) }}
                >
                  {getInitials(donorSearchResult.fullName)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{donorSearchResult.fullName}</h3>
                  <p className="text-sm text-gray-600">Click to start conversation</p>
                </div>
              </div>
              <div className="flex items-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {search && !donorSearchResult && !loadingSearch && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
            <p className="text-gray-600">No donors found with that name</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Conversations */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Conversations</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredChats.length} conversations
          </span>
        </div>

        {loadingChats ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-300" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-500">
              {search ? "No conversations match your search" : "Start by searching for donors above"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChats.map((chat) => {
              const profile = donorProfiles[chat.donorId] || {
                name: "Loading...",
                profilePhoto: null,
              }

              return (
                <div
                  key={chat.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-green-300 transition-all duration-200"
                  onClick={() => openChat(chat.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: generateColor(profile.name) }}
                      >
                        {getInitials(profile.name)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{profile.name}</h3>
                        <span className="text-xs text-gray-500">{formatRelativeTime(chat.lastTimestamp)}</span>
                      </div>
                      <p className="text-gray-600 text-sm truncate">{chat.lastMessage || "No messages yet"}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
