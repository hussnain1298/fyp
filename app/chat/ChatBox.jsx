"use client"

import { useState, useEffect } from "react"
import { firestore, auth } from "@/lib/firebase"
import { collection, addDoc, getDoc, serverTimestamp, doc, onSnapshot, query, orderBy } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

export default function ChatBox({ chatId }) {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [userId, setUserId] = useState(null)
  const [userRole, setUserRole] = useState("")
  const [userName, setUserName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isParticipant, setIsParticipant] = useState(false)

  // 🔹 Get Authenticated User & Determine Role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)

        // Fetch user details from Firestore
        try {
          const userRef = doc(firestore, "users", user.uid)
          const userDoc = await getDoc(userRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.userType || "Unknown")
            setUserName(userData.fullName || "Anonymous")
          } else {
            setError("User not found in Firestore.")
          }
        } catch (err) {
          setError("Error fetching user data: " + err.message)
        }
      } else {
        setError("User not authenticated.")
      }
    })

    return () => unsubscribe()
  }, [])

  // 🔹 Fetch Messages in Realtime from Firestore
  useEffect(() => {
    if (!chatId || !userId) return

    setLoading(true)
    const checkChatParticipants = async () => {
      try {
        const chatRef = doc(firestore, "chats", chatId)
        const chatSnapshot = await getDoc(chatRef)

        if (chatSnapshot.exists()) {
          const participants = chatSnapshot.data().participants || {}

          // Check if the user is a participant
          if (participants[userId]) {
            setIsParticipant(true)
            console.log("User is a participant, ready to chat.")

            // Now fetch messages
            const messagesRef = collection(firestore, `chats/${chatId}/messages`)
            const q = query(messagesRef, orderBy("timestamp", "asc"))

            const unsubscribe = onSnapshot(
              q,
              (snapshot) => {
                const msgs = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))
                setMessages(msgs)
                setLoading(false)
              },
              (err) => {
                console.error("Error in messages snapshot:", err)
                setError("Error loading messages: " + err.message)
                setLoading(false)
              },
            )

            return () => unsubscribe()
          } else {
            setError("You are not a participant in this chat.")
            setLoading(false)
          }
        } else {
          setError("Chat not found.")
          setLoading(false)
        }
      } catch (err) {
        console.error("Error checking participants:", err)
        setError("Error checking participants: " + err.message)
        setLoading(false)
      }
    }

    checkChatParticipants()
  }, [chatId, userId])

  // 🔹 Send Message Function
  const sendMessage = async () => {
    if (!message.trim() || !userId || !chatId || !isParticipant) return

    try {
      await addDoc(collection(firestore, `chats/${chatId}/messages`), {
        userId,
        senderName: userName,
        senderRole: userRole,
        text: message.trim(),
        timestamp: serverTimestamp(),
      })
      setMessage("") // Clear input field
    } catch (error) {
      console.error("🔥 Error sending message:", error)
      setError("Failed to send message: " + error.message)
    }
  }

  return (
    <div className="mt-4">
      {/* Messages List */}
      <div className="h-64 overflow-y-auto bg-gray-200 p-2 rounded-md">
        {loading && <p className="text-center text-gray-600">Loading messages...</p>}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        {messages.length === 0 && !loading && !error ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded-md mb-1 ${
                msg.userId === userId ? "bg-blue-500 text-white text-right" : "bg-gray-300 text-black text-left"
              }`}
            >
              <small className="block text-xs font-bold">
                {msg.senderName} ({msg.senderRole})
              </small>
              {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Input Box */}
      <div className="flex mt-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full p-2 border rounded-md"
          disabled={!isParticipant || loading}
        />
        <button
          onClick={sendMessage}
          className={`ml-2 p-2 ${
            isParticipant && message.trim() ? "bg-green-500 hover:bg-green-600" : "bg-gray-300 cursor-not-allowed"
          } text-white rounded-md`}
          disabled={!isParticipant || !message.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  )
}
