"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"

export default function RequestsHoverDemo() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, "requests"))
        const requestList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          description: doc.data().description,
          status: doc.data().status || "Pending",
          orphanageId: doc.data().orphanageId || "",
          orphanageEmail: doc.data().orphanageEmail || "",
        }))
        setRequests(requestList)
      } catch (err) {
        console.error("Error fetching requests:", err)
        setError("Failed to load requests: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [])

  // Handle "Chat" button click
  const handleChat = async (request) => {
    // Prevent multiple clicks
    if (isProcessing) return
    setIsProcessing(true)
    setError("")

    try {
      const user = auth.currentUser
      if (!user) {
        router.push("/login?redirect=chat")
        return
      }

      const donorId = user.uid
      const orphanageId = request.orphanageId

      // Create a new chat document with both donor and orphanage as participants
      try {
        const chatDocRef = await addDoc(collection(firestore, "chats"), {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          createdBy: donorId,
          participants: {
            [donorId]: true,
            [orphanageId]: true,
          },
          title: request.title,
          description: request.description,
          requestId: request.id,
        })

        // Navigate to the new chat
        router.push(
          `/chat?chatId=${chatDocRef.id}&title=${encodeURIComponent(request.title)}&description=${encodeURIComponent(request.description)}&orphanageId=${orphanageId}&requestId=${request.id}&orphanageEmail=${request.orphanageEmail}`,
        )
      } catch (err) {
        console.error("Error creating chat:", err)
        setError("Error creating chat: " + err.message)
        setIsProcessing(false)
      }
    } catch (error) {
      console.error("Error in handleChat:", error)
      setError("Error: " + error.message)
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {loading && <p className="text-gray-500 text-center">Loading...</p>}

      {!loading && requests.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div key={request.id} className="p-4 border rounded-lg shadow-md bg-white">
              <h3 className="text-lg font-semibold">{request.title}</h3>
              <p className="text-gray-600">{request.description}</p>

              <button
                onClick={() => handleChat(request)}
                disabled={isProcessing}
                className={`mt-2 ${isProcessing ? "bg-gray-400" : "bg-green-500"} text-white px-4 py-2 rounded-md w-full transition`}
              >
                {isProcessing ? "Processing..." : "Chat"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500">No requests available.</p>
      )}
    </div>
  )
}
