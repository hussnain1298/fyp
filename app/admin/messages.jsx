"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { firestore, auth } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore"
import { useRouter } from "next/navigation"
import { MessageSquare, Search, Users, Building, Plus, Clock, User, Shield } from "lucide-react"

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
  if (!name) return "A"
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

const getUserTypeColor = (userType) => {
  switch (userType) {
    case "Donor":
      return "bg-blue-100 text-blue-700"
    case "Orphanage":
      return "bg-green-100 text-green-700"
    case "admin":
      return "bg-purple-100 text-purple-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

// Skeleton component for loading states
const UserSkeleton = () => (
  <div className="p-3 rounded-lg animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
)

export default function AdminMessages() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [chats, setChats] = useState([])
  const [userProfiles, setUserProfiles] = useState({})
  const [allUsers, setAllUsers] = useState([])
  const [search, setSearch] = useState("")
  const [userSearch, setUserSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [loading, setLoading] = useState(true)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({
    totalChats: 0,
    donorChats: 0,
    orphanageChats: 0,
    unreadChats: 0,
  })
  const router = useRouter()

  // Cache for user profiles to avoid repeated fetches
  const profileCache = useMemo(() => new Map(), [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", currentUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserProfile(userData)

            if (userData.userType !== "admin") {
              setError("Access denied. Admin privileges required.")
              setLoading(false)
              return
            }
          } else {
            setError("User profile not found.")
            setLoading(false)
            return
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          setError("Failed to verify admin access.")
          setLoading(false)
          return
        }
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch all users with lazy loading
  useEffect(() => {
    if (!user || !userProfile || userProfile.userType !== "admin") return

    const fetchAllUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(firestore, "users"))
        const users = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            uid: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.userType === "Donor" || user.userType === "Orphanage")

        setAllUsers(users)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    fetchAllUsers()
  }, [user, userProfile])

  // Fetch admin chats with real-time updates
  useEffect(() => {
    if (!user || !userProfile || userProfile.userType !== "admin") return

    const fetchChats = () => {
      setLoading(true)
      try {
        const adminChatsRef = collection(firestore, "adminChats")

        const unsubscribe = onSnapshot(
          adminChatsRef,
          async (snapshot) => {
            const chatPromises = snapshot.docs.map(async (docSnap) => {
              const chatData = docSnap.data()
              const chatId = docSnap.id

              // Only include chats where current user is admin
              if (chatData.adminId !== user.uid) {
                return null
              }

              const userId = chatData.userId

              let lastMessage = null
              let lastTimestamp = null
              let unreadCount = 0

              try {
                const messagesQuery = query(
                  collection(firestore, "adminChats", chatId, "messages"),
                  orderBy("timestamp", "desc"),
                  limit(1),
                )
                const messagesSnap = await getDocs(messagesQuery)
                if (!messagesSnap.empty) {
                  const msg = messagesSnap.docs[0].data()
                  lastMessage = msg.text || ""
                  lastTimestamp = msg.timestamp?.toDate() || null
                }

                const allMessagesSnap = await getDocs(collection(firestore, "adminChats", chatId, "messages"))
                unreadCount = allMessagesSnap.docs.filter((doc) => {
                  const data = doc.data()
                  return data.senderId !== user.uid && !data.read
                }).length
              } catch (e) {
                console.error("Error fetching messages:", e)
              }

              return {
                id: chatId,
                ...chatData,
                userId,
                lastMessage,
                lastTimestamp,
                unreadCount,
              }
            })

            const enrichedChats = (await Promise.all(chatPromises)).filter((chat) => chat !== null)
            setChats(enrichedChats)

            // Calculate stats
            const totalChats = enrichedChats.length
            const donorChats = enrichedChats.filter((chat) => userProfiles[chat.userId]?.userType === "Donor").length
            const orphanageChats = enrichedChats.filter(
              (chat) => userProfiles[chat.userId]?.userType === "Orphanage",
            ).length
            const unreadChats = enrichedChats.filter((chat) => chat.unreadCount > 0).length

            setStats({ totalChats, donorChats, orphanageChats, unreadChats })
            setLoading(false)
          },
          (error) => {
            console.error("Error in chat listener:", error)
            setError("Failed to load conversations. Please refresh the page.")
            setLoading(false)
          },
        )

        return () => unsubscribe()
      } catch (error) {
        console.error("Error setting up chat listener:", error)
        setError("Failed to load conversations. Please try again.")
        setLoading(false)
      }
    }

    const unsubscribe = fetchChats()
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [user, userProfile, userProfiles])

  // Fetch user profiles with caching
  useEffect(() => {
    const userIds = chats.map((chat) => chat.userId).filter((id) => id && !userProfiles[id] && !profileCache.has(id))

    if (userIds.length === 0) return

    const fetchProfiles = async () => {
      const updates = {}
      for (const id of userIds) {
        if (profileCache.has(id)) {
          updates[id] = profileCache.get(id)
          continue
        }

        try {
          const docSnap = await getDoc(doc(firestore, "users", id))
          if (docSnap.exists()) {
            const data = docSnap.data()
            const profile = {
              name: data.orgName || data.fullName || "Unknown User",
              userType: data.userType || "Unknown",
              email: data.email || "",
              city: data.city || "",
              contactNumber: data.contactNumber || "",
              profilePicture: data.profilePicture || null,
            }
            updates[id] = profile
            profileCache.set(id, profile)
          } else {
            const defaultProfile = {
              name: "Unknown User",
              userType: "Unknown",
              email: "",
              city: "",
              contactNumber: "",
              profilePicture: null,
            }
            updates[id] = defaultProfile
            profileCache.set(id, defaultProfile)
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
          const errorProfile = {
            name: "Unknown User",
            userType: "Unknown",
            email: "",
            city: "",
            contactNumber: "",
            profilePicture: null,
          }
          updates[id] = errorProfile
          profileCache.set(id, errorProfile)
        }
      }
      setUserProfiles((prev) => ({ ...prev, ...updates }))
    }

    fetchProfiles()
  }, [chats, userProfiles, profileCache])

  // Start new chat with user
  const startChat = async (targetUser) => {
    if (!user || !targetUser) return

    try {
      // Check if chat already exists
      const adminChatsSnapshot = await getDocs(collection(firestore, "adminChats"))
      const existingChat = adminChatsSnapshot.docs.find((doc) => {
        const data = doc.data()
        return data.adminId === user.uid && data.userId === targetUser.uid
      })

      if (existingChat) {
        setShowNewChatModal(false)
        setUserSearch("")
        return router.push(`/chat?chatId=${existingChat.id}&isAdmin=true`)
      }

      // Create new admin chat
      const chatRef = await addDoc(collection(firestore, "adminChats"), {
        adminId: user.uid,
        userId: targetUser.uid,
        userType: targetUser.userType,
        participants: [user.uid, targetUser.uid],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
      })

      setShowNewChatModal(false)
      setUserSearch("")
      router.push(`/chat?chatId=${chatRef.id}&isAdmin=true`)
    } catch (error) {
      console.error("Failed to start chat:", error)
      setError("Failed to start conversation. Please try again.")
    }
  }

  // Open existing chat
  const openChat = useCallback(
    (chatId) => {
      if (!chatId) return
      router.push(`/chat?chatId=${chatId}&isAdmin=true`)
    },
    [router],
  )

  // Filter chats based on search and type
  const filteredChats = useMemo(() => {
    return chats
      .filter((chat) => {
        const profile = userProfiles[chat.userId]
        if (!profile) return false

        // Filter by type
        if (filterType !== "all" && profile.userType !== filterType) return false

        // Filter by search
        if (search) {
          const searchTarget = (profile.name || "").toLowerCase()
          const emailTarget = (profile.email || "").toLowerCase()
          if (!searchTarget.includes(search.toLowerCase()) && !emailTarget.includes(search.toLowerCase())) return false
        }

        return true
      })
      .sort((a, b) => {
        // Sort by unread first, then by last message time
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1
        return (b.lastTimestamp?.getTime() || 0) - (a.lastTimestamp?.getTime() || 0)
      })
  }, [chats, userProfiles, search, filterType])

  // Filter users for new chat modal with lazy loading and animations
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return []

    setLoadingUsers(true)
    setTimeout(() => setLoadingUsers(false), 300) // Simulate loading for smooth UX

    return allUsers
      .filter((user) => {
        const name = (user.orgName || user.fullName || "").toLowerCase()
        const email = (user.email || "").toLowerCase()
        return name.includes(userSearch.toLowerCase()) || email.includes(userSearch.toLowerCase())
      })
      .slice(0, 10)
  }, [allUsers, userSearch])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access admin messages</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (userProfile && userProfile.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Admin privileges required to access this page</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Messages</h1>
                <p className="text-gray-600">Communicate with donors and orphanages</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Chats</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalChats}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-gray-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Donor Chats</p>
                <p className="text-2xl font-bold text-blue-600">{stats.donorChats}</p>
              </div>
              <User className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Orphanage Chats</p>
                <p className="text-2xl font-bold text-green-600">{stats.orphanageChats}</p>
              </div>
              <Building className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-red-600">{stats.unreadChats}</p>
              </div>
              <Clock className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search conversations by user name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="Donor">Donors</option>
                <option value="Orphanage">Orphanages</option>
              </select>
            </div>
          </div>
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

        {/* Conversations List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredChats.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
              <p className="text-gray-500 mb-4">
                {search || filterType !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Start a new conversation with users"}
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredChats.map((chat, index) => {
                const profile = userProfiles[chat.userId] || {
                  name: "Loading...",
                  userType: "Unknown",
                  email: "",
                  city: "",
                  profilePicture: null,
                }

                return (
                  <div
                    key={chat.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => openChat(chat.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                          style={{ backgroundColor: generateColor(profile.name, profile.userType) }}
                        >
                          {getInitials(profile.name)}
                        </div>
                        {chat.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                            {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">{profile.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getUserTypeColor(profile.userType)}`}
                            >
                              {getUserTypeIcon(profile.userType)}
                              {profile.userType}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{formatRelativeTime(chat.lastTimestamp)}</span>
                        </div>
                        <p className="text-gray-600 text-sm truncate">{chat.lastMessage || "No messages yet"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {profile.email && <span className="text-xs text-gray-500">{profile.email}</span>}
                          {profile.city && <span className="text-xs text-gray-500">• {profile.city}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden animate-slideUp">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Start New Conversation</h3>
                  <button
                    onClick={() => {
                      setShowNewChatModal(false)
                      setUserSearch("")
                      setLoadingUsers(false)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <UserSkeleton key={i} />
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">{userSearch ? "No users found" : "Start typing to search users"}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((targetUser, index) => (
                        <div
                          key={targetUser.uid}
                          className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] animate-fadeInUp"
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => startChat(targetUser)}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                              style={{
                                backgroundColor: generateColor(
                                  targetUser.orgName || targetUser.fullName,
                                  targetUser.userType,
                                ),
                              }}
                            >
                              {getInitials(targetUser.orgName || targetUser.fullName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {targetUser.orgName || targetUser.fullName}
                                </h4>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getUserTypeColor(targetUser.userType)}`}
                                >
                                  {getUserTypeIcon(targetUser.userType)}
                                  {targetUser.userType}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate">{targetUser.email}</p>
                              {targetUser.city && <p className="text-xs text-gray-400">{targetUser.city}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
