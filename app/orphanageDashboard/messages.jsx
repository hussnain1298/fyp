"use client"

import { useState, useEffect, useMemo } from "react"
import { firestore, auth } from "@/lib/firebase" // Assuming firebase is in lib/firebase
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
  setDoc,
  onSnapshot,
} from "firebase/firestore"
import { useRouter } from "next/navigation"
import { MessageSquare, Search, User, Plus, Shield } from "lucide-react"

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
  if (!name) return "D"
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
  const colors = ["#3B82F6", "#1D4ED8", "#2563EB", "#1E40AF", "#60A5FA", "#93C5FD"]
  return colors[Math.abs(hash) % colors.length]
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

export default function OrphanageMessages() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [chats, setChats] = useState([])
  const [adminChats, setAdminChats] = useState([])
  const [donorProfiles, setDonorProfiles] = useState({})
  const [allDonors, setAllDonors] = useState([])
  const [search, setSearch] = useState("")
  const [donorSearch, setDonorSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Cache for profiles
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
            if (userData.userType !== "Orphanage") {
              setError("Access denied. Orphanage account required.")
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
          setError("Failed to load user profile.")
          setLoading(false)
          return
        }
      } else {
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Fetch all donors
  useEffect(() => {
    if (!user || !userProfile || userProfile.userType !== "Orphanage") return
    const fetchDonors = async () => {
      try {
        const usersSnapshot = await getDocs(collection(firestore, "users"))
        const donors = usersSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            uid: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.userType === "Donor")
        setAllDonors(donors)
      } catch (error) {
        console.error("Error fetching donors:", error)
      }
    }
    fetchDonors()
  }, [user, userProfile])

  // Fetch regular chats with real-time updates
  useEffect(() => {
    if (!user || !userProfile || userProfile.userType !== "Orphanage") return
    const fetchChats = () => {
      try {
        const chatsRef = collection(firestore, "chats")
        const unsubscribe = onSnapshot(
          chatsRef,
          async (snapshot) => {
            const userChats = snapshot.docs.filter((doc) => {
              const data = doc.data()
              return data.participants?.includes(user.uid)
            })
            const chatPromises = userChats.map(async (docSnap) => {
              const chatData = docSnap.data()
              const chatId = docSnap.id
              const donorId = chatData.donorId
              let lastMessage = null
              let lastTimestamp = null
              let unreadCount = 0
              try {
                const messagesQuery = query(
                  collection(firestore, "chats", chatId, "messages"),
                  orderBy("timestamp", "desc"),
                  limit(1),
                )
                const messagesSnap = await getDocs(messagesQuery)
                if (!messagesSnap.empty) {
                  const msg = messagesSnap.docs[0].data()
                  lastMessage = msg.text || ""
                  lastTimestamp = msg.timestamp?.toDate() || null
                }
                const allMessagesSnap = await getDocs(collection(firestore, "chats", chatId, "messages"))
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
                donorId,
                lastMessage,
                lastTimestamp,
                unreadCount,
                type: "donor",
              }
            })
            const enrichedChats = await Promise.all(chatPromises)
            setChats(enrichedChats)
          },
          (error) => {
            console.error("Error in chats listener:", error)
            setError("Failed to load conversations. Please refresh the page.")
          },
        )
        return () => unsubscribe()
      } catch (error) {
        console.error("Error setting up chats listener:", error)
        setError("Failed to load conversations.")
      }
    }
    const unsubscribe = fetchChats()
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [user, userProfile])

  // Fetch admin chats with real-time updates
  useEffect(() => {
    if (!user || !userProfile || userProfile.userType !== "Orphanage") return
    const fetchAdminChats = () => {
      try {
        const adminChatsRef = collection(firestore, "adminChats")
        const unsubscribe = onSnapshot(
          adminChatsRef,
          async (snapshot) => {
            const userAdminChats = snapshot.docs.filter((doc) => {
              const data = doc.data()
              return data.userId === user.uid
            })
            const chatPromises = userAdminChats.map(async (docSnap) => {
              const chatData = docSnap.data()
              const chatId = docSnap.id
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
                console.error("Error fetching admin messages:", e)
              }
              return {
                id: chatId,
                ...chatData,
                lastMessage,
                lastTimestamp,
                unreadCount,
                type: "admin",
              }
            })
            const enrichedAdminChats = await Promise.all(chatPromises)
            setAdminChats(enrichedAdminChats)
          },
          (error) => {
            console.error("Error in admin chats listener:", error)
          },
        )
        return () => unsubscribe()
      } catch (error) {
        console.error("Error setting up admin chats listener:", error)
      }
    }
    const unsubscribe = fetchAdminChats()
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [user, userProfile])

  // Fetch donor profiles with caching
  useEffect(() => {
    const donorIds = chats.map((chat) => chat.donorId).filter((id) => id && !donorProfiles[id] && !profileCache.has(id))
    if (donorIds.length === 0) return
    const fetchProfiles = async () => {
      const updates = {}
      for (const id of donorIds) {
        if (profileCache.has(id)) {
          updates[id] = profileCache.get(id)
          continue
        }
        try {
          const docSnap = await getDoc(doc(firestore, "users", id))
          if (docSnap.exists()) {
            const data = docSnap.data()
            const profile = {
              name: data.fullName || "Unknown Donor",
              email: data.email || "",
              city: data.city || "",
              contactNumber: data.contactNumber || "",
              profilePicture: data.profilePicture || null,
            }
            updates[id] = profile
            profileCache.set(id, profile)
          }
        } catch (error) {
          console.error("Error fetching profile:", error)
          const errorProfile = { name: "Unknown Donor", email: "", city: "", contactNumber: "", profilePicture: null }
          updates[id] = errorProfile
          profileCache.set(id, errorProfile)
        }
      }
      setDonorProfiles((prev) => ({ ...prev, ...updates }))
    }
    fetchProfiles()
  }, [chats, donorProfiles, profileCache])

  useEffect(() => {
    setLoading(false)
  }, [chats, adminChats])

  // Start new chat with donor
  const startChat = async (donor) => {
    if (!user || !donor) return
    try {
      // Create a consistent chat ID
      const chatId = `${donor.uid}_${user.uid}`
      // Check if chat already exists
      const existingChat = await getDoc(doc(firestore, "chats", chatId))
      if (existingChat.exists()) {
        setShowNewChatModal(false)
        setDonorSearch("")
        return router.push(`/chat?chatId=${chatId}`)
      }
      // Create new chat with consistent ID
      await setDoc(doc(firestore, "chats", chatId), {
        donorId: donor.uid,
        orphanageId: user.uid,
        participants: [donor.uid, user.uid],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
      })
      setShowNewChatModal(false)
      setDonorSearch("")
      router.push(`/chat?chatId=${chatId}`)
    } catch (error) {
      console.error("Failed to start chat:", error)
      setError("Failed to start conversation. Please try again.")
    }
  }

  // Start admin chat
  const startAdminChat = async () => {
    if (!user) return
    try {
      // Check if admin chat already exists
      const adminChatsSnapshot = await getDocs(collection(firestore, "adminChats"))
      const existingChat = adminChatsSnapshot.docs.find((doc) => {
        const data = doc.data()
        return data.userId === user.uid
      })
      if (existingChat) {
        return router.push(`/chat?chatId=${existingChat.id}&isAdmin=true`)
      }
      // Find an admin user
      const usersSnapshot = await getDocs(collection(firestore, "users"))
      const adminUser = usersSnapshot.docs.find((doc) => {
        const data = doc.data()
        return data.userType === "admin"
      })
      if (!adminUser) {
        setError("No admin available at the moment. Please try again later.")
        return
      }
      const adminId = adminUser.id
      // Create new admin chat
      const chatRef = await addDoc(collection(firestore, "adminChats"), {
        adminId: adminId,
        userId: user.uid,
        userType: userProfile.userType,
        participants: [adminId, user.uid],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
      })
      router.push(`/chat?chatId=${chatRef.id}&isAdmin=true`)
    } catch (error) {
      console.error("Failed to start admin chat:", error)
      setError("Failed to contact admin. Please try again.")
    }
  }

  // Open existing chat
  const openChat = (chatId, isAdminChat = false) => {
    if (!chatId) return
    const url = isAdminChat ? `/chat?chatId=${chatId}&isAdmin=true` : `/chat?chatId=${chatId}`
    router.push(url)
  }

  // Filter chats based on search
  const allConversations = useMemo(() => {
    const combined = [...chats, ...adminChats]
    const searchLower = search.toLowerCase()

    return combined
      .filter((chat) => {
        if (chat.type === "admin") {
          // For admin chats, search against hardcoded admin profile
          const adminName = "admin support".toLowerCase()
          const adminEmail = "admin@careconnect.com".toLowerCase()
          return adminName.includes(searchLower) || adminEmail.includes(searchLower)
        } else {
          // For donor chats, use the fetched donor profile
          const profile = donorProfiles[chat.donorId]
          if (!profile) return false // Exclude if profile not found or not yet loaded

          const donorName = (profile.name || "").toLowerCase()
          const donorEmail = (profile.email || "").toLowerCase()
          return donorName.includes(searchLower) || donorEmail.includes(searchLower)
        }
      })
      .sort((a, b) => {
        // Sort by unread first, then by last message time
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1
        return (b.lastTimestamp?.getTime() || 0) - (a.lastTimestamp?.getTime() || 0)
      })
  }, [chats, adminChats, donorProfiles, search])

  // Filter donors for new chat modal with animations
  const filteredDonors = useMemo(() => {
    if (!donorSearch.trim()) return []
    setLoadingUsers(true)
    setTimeout(() => setLoadingUsers(false), 300)
    return allDonors
      .filter((donor) => {
        const name = (donor.fullName || "").toLowerCase()
        const email = (donor.email || "").toLowerCase()
        return name.includes(donorSearch.toLowerCase()) || email.includes(donorSearch.toLowerCase())
      })
      .slice(0, 10)
  }, [allDonors, donorSearch])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access messages</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (userProfile && userProfile.userType !== "Orphanage") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Orphanage account required to access this page</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-600">Connect with donors and get support</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={startAdminChat}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Contact Admin
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
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
          {allConversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500 mb-4">Start a conversation with a donor or contact admin for support</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start New Chat
                </button>
                <button
                  onClick={startAdminChat}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Contact Admin
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {allConversations.map((chat, index) => {
                const isAdminChat = chat.type === "admin"
                const profile = isAdminChat
                  ? { name: "Admin Support", email: "admin@careconnect.com", city: "Support" }
                  : donorProfiles[chat.donorId] || { name: "Loading...", email: "", city: "" }
                return (
                  <div
                    key={chat.id}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => openChat(chat.id, isAdminChat)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                          style={{
                            backgroundColor: isAdminChat ? "#8B5CF6" : generateColor(profile.name),
                          }}
                        >
                          {isAdminChat ? <Shield className="w-6 h-6" /> : getInitials(profile.name)}
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
                            {isAdminChat && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
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
                      setDonorSearch("")
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
                    placeholder="Search donors..."
                    value={donorSearch}
                    onChange={(e) => setDonorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <UserSkeleton key={i} />
                      ))}
                    </div>
                  ) : filteredDonors.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">
                        {donorSearch ? "No donors found" : "Start typing to search donors"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredDonors.map((donor, index) => (
                        <div
                          key={donor.uid}
                          className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] animate-fadeInUp"
                          style={{ animationDelay: `${index * 50}ms` }}
                          onClick={() => startChat(donor)}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                              style={{ backgroundColor: generateColor(donor.fullName) }}
                            >
                              {getInitials(donor.fullName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{donor.fullName}</h4>
                              <p className="text-sm text-gray-500 truncate">{donor.email}</p>
                              {donor.city && <p className="text-xs text-gray-400">{donor.city}</p>}
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
