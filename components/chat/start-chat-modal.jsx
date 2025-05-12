"use client"

import { useState, useEffect } from "react"
import { X, Search, User } from "lucide-react"
import { useChat } from "./chat-context"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { firestore } from "@/lib/firebase"

const StartChatModal = ({ isOpen, onClose, userType }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { createNewChat, currentUser } = useChat()
  const router = useRouter()

  useEffect(() => {
    if (isOpen && searchTerm.length >= 3) {
      searchUsers()
    }
  }, [searchTerm, isOpen])

  const searchUsers = async () => {
    if (!currentUser) return

    setLoading(true)
    setError("")

    try {
      // Create a query to find users by name or email
      const usersQuery = query(
        collection(firestore, "users"),
        where("email", ">=", searchTerm),
        where("email", "<=", searchTerm + "\uf8ff"),
      )

      // If userType is specified, filter by that type
      let filteredQuery = usersQuery
      if (userType) {
        filteredQuery = query(usersQuery, where("userType", "==", userType))
      }

      const snapshot = await getDocs(filteredQuery)
      let usersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // If no results by email, try searching by firstName
      if (usersList.length === 0) {
        const nameQuery = query(
          collection(firestore, "users"),
          where("firstName", ">=", searchTerm),
          where("firstName", "<=", searchTerm + "\uf8ff"),
        )

        let nameFilteredQuery = nameQuery
        if (userType) {
          nameFilteredQuery = query(nameQuery, where("userType", "==", userType))
        }

        const nameSnapshot = await getDocs(nameFilteredQuery)
        usersList = nameSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // If still no results, try searching by fullName
      if (usersList.length === 0) {
        const fullNameQuery = query(
          collection(firestore, "users"),
          where("fullName", ">=", searchTerm),
          where("fullName", "<=", searchTerm + "\uf8ff"),
        )

        let fullNameFilteredQuery = fullNameQuery
        if (userType) {
          fullNameFilteredQuery = query(fullNameQuery, where("userType", "==", userType))
        }

        const fullNameSnapshot = await getDocs(fullNameFilteredQuery)
        usersList = fullNameSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      }

      // Filter out current user
      usersList = usersList.filter((user) => user.id !== currentUser.uid)

      setUsers(usersList)
    } catch (error) {
      console.error("Error searching users:", error)
      setError("Failed to search users. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = async (userId) => {
    try {
      const chatId = await createNewChat(userId)
      onClose()
      router.push(`/messages?chatId=${chatId}`)
    } catch (error) {
      console.error("Error starting chat:", error)
      setError("Failed to start chat. Please try again.")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Start a New Chat</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-3 hover:bg-gray-50 rounded-md cursor-pointer"
                  onClick={() => handleStartChat(user.id)}
                >
                  <div className="bg-gray-200 rounded-full p-2 mr-3">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              ))
            ) : searchTerm.length >= 3 ? (
              <p className="text-center text-gray-500 p-4">No users found</p>
            ) : (
              <p className="text-center text-gray-500 p-4">Type at least 3 characters to search</p>
            )}
          </div>
        </div>

        <div className="border-t p-4">
          <button onClick={onClose} className="w-full py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default StartChatModal
