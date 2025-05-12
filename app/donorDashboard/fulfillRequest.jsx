"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { firestore, auth } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore"
import ChatButton from "@/components/chat/chat-button"

const FulfillRequests = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingDonation, setEditingDonation] = useState(null)
  const [editAmount, setEditAmount] = useState("")
  const router = useRouter()

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true)
      setError("")

      const user = auth.currentUser
      if (!user) {
        setError("You must be logged in to view requests.")
        return
      }

      try {
        // Query donations collection where the donorId matches the current user's UID
        const q = query(
          collection(firestore, "donations"),
          where("donorId", "==", user.uid), // Fetch donations related to this user (donor)
        )
        const querySnapshot = await getDocs(q)

        // Create an array of requests (each donation corresponds to a request)
        const requestList = await Promise.all(
          querySnapshot.docs.map(async (document) => {
            const donationData = document.data()

            // Fetch the related request for this donation
            const requestDocRef = doc(firestore, "requests", donationData.requestId)
            const requestDocSnap = await getDoc(requestDocRef)

            if (!requestDocSnap.exists()) {
              console.log("Request not found for donation:", document.id)
              return null
            }

            const requestData = requestDocSnap.data()

            // Combine donation and request data
            return {
              id: requestDocSnap.id,
              ...requestData,
              donationId: document.id,
              donationType: donationData.donationType,
              donationAmount: donationData.amount,
              donationStatus: donationData.confirmed ? "Confirmed" : "Pending",
              donationClothesCount: donationData.numClothes, // Assuming donation contains clothes count
              donationFoodDescription: donationData.foodDescription, // Assuming donation contains food description
              orphanageId: requestData.orphanageId, // Store the orphanage ID for chat
            }
          }),
        )

        // Filter out any null values (requests that weren't found)
        const validRequests = requestList.filter((request) => request !== null)
        setRequests(validRequests) // Set the requests with the donations included
      } catch (err) {
        console.error("Failed to load requests:", err)
        setError("Failed to load requests: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests() // Fetch donations and related requests
  }, [])

  // Handle delete operation
  const handleDelete = async (donationId, requestId) => {
    if (!window.confirm("Are you sure you want to delete this donation?")) return

    try {
      // Delete the donation document
      await deleteDoc(doc(firestore, "donations", donationId))

      // Update the request to remove this donation reference
      try {
        const requestRef = doc(firestore, "requests", requestId)
        await updateDoc(requestRef, {
          donations: arrayRemove(donationId),
        })
      } catch (updateError) {
        console.error("Error updating request (donation was deleted):", updateError)
        // Continue even if this fails, as the donation is already deleted
      }

      setRequests(requests.filter((request) => request.donationId !== donationId)) // Remove from local state
    } catch (err) {
      console.error("Error deleting donation:", err) // Log the error
      setError("Failed to delete donation: " + err.message)
    }
  }

  // Open edit modal
  const handleEditClick = (donation) => {
    setEditingDonation(donation)
    setEditAmount(donation.donationAmount || "")
  }

  // Close edit modal
  const handleCloseEdit = () => {
    setEditingDonation(null)
    setEditAmount("")
  }

  // Save edited donation
  const handleSaveEdit = async () => {
    if (!editingDonation) return

    try {
      // Check if editAmount is a valid number
      const amount = Number(editAmount)
      if (isNaN(amount) || amount <= 0) {
        setError("Please enter a valid donation amount.")
        return
      }

      // Update the donation document
      const donationRef = doc(firestore, "donations", editingDonation.donationId)
      await updateDoc(donationRef, {
        amount: amount, // Update the donation amount
      })

      // Update local state with the new donation amount
      setRequests((prevRequests) =>
        prevRequests.map((request) => {
          if (request.donationId === editingDonation.donationId) {
            return { ...request, donationAmount: amount } // Update donation amount in local state
          }
          return request
        }),
      )

      // Close the edit modal
      handleCloseEdit()
    } catch (err) {
      console.error("Error editing donation:", err) // Log the error
      setError("Failed to edit donation: " + err.message)
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6 mt-10">FULFILL A REQUEST</h2>

        {/* Donate Now Button */}
        <div className="text-center mb-6">
          <button
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md"
            onClick={() => router.push("/donationformforreq")}
          >
            Donate Now
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {requests.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No fulfill requests yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.donationId} className="bg-gray-100 p-4 rounded-lg shadow-md">
                  <h2 className="text-lg font-bold">{request.title}</h2>
                  <p className="text-gray-700">{request.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Request ID:</strong> {request.id}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-md ${
                        request.donationStatus === "Pending" ? "bg-yellow-400" : "bg-green-500"
                      } text-white`}
                    >
                      {request.donationStatus}
                    </span>
                  </p>

                  {/* Donations List */}
                  {request.donationType && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-sm">Donation:</h3>
                      <ul>
                        <li className="text-sm text-gray-700">
                          Donation Type: {request.donationType} - Amount: {request.donationAmount || "N/A"}
                        </li>
                        {/* Display donation details based on type */}
                        {request.donationType === "Clothes" && request.donationClothesCount && (
                          <li className="text-sm text-gray-700">Number of Clothes: {request.donationClothesCount}</li>
                        )}
                        {request.donationType === "Food" && request.donationFoodDescription && (
                          <li className="text-sm text-gray-700">Food Description: {request.donationFoodDescription}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex space-x-4 mt-4">
                    {/* Use ChatButton component with both orphanage ID and request ID */}
                    <ChatButton userId={request.orphanageId} requestId={request.id} />

                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-400"
                      onClick={() => handleEditClick(request)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                      onClick={() => handleDelete(request.donationId, request.id)} // Delete the donation
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Donation Modal */}
        {editingDonation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
              <h3 className="text-xl font-bold mb-4">Edit Donation</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Donation Amount</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="1"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FulfillRequests
