// ServiceFulfillModal.jsx
"use client"

import { useState } from "react"
import { db } from "@/lib/firebase" // Changed from firestore to db for consistency
import { updateDoc, doc, addDoc, collection } from "firebase/firestore"
import { toast } from "react-toastify" // Assuming toast is available

export default function ServiceFulfillModal({ service, user, onFulfill, onClose }) {
  const [processing, setProcessing] = useState(false)
  const [donationNote, setDonationNote] = useState("")
  const [error, setError] = useState("")

  const fulfillService = async () => {
    if (!user || !user.uid) {
      toast.error("Please login as donor to fulfill this service.")
      return
    }

    if (!donationNote.trim()) {
      setError("Please enter a donation note.")
      return
    }

    setProcessing(true)
    setError("")

    try {
      // Create donation linked to this service and orphanage
      await addDoc(collection(db, "donations"), {
        // Changed from firestore to db
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: service.orphanageId,
        serviceId: service.id,
        donationNote: donationNote.trim(), // Trim the note
        status: "Pending", // Initial status for the donation record
        timestamp: new Date(),
      })

      // Update service status to In Progress with only allowed fields
      await updateDoc(doc(db, "services", service.id), {
        // Changed from firestore to db
        status: "In Progress", // Update service status
        lastFulfillmentNote: donationNote.trim(),
        lastFulfillmentTime: new Date().toISOString(),
      })

      toast.success(`Service "${service.title}" fulfillment submitted!`)
      setDonationNote("")
      if (onFulfill) onFulfill(service.id) // Notify parent to update UI
      onClose() // Close the modal
    } catch (err) {
      console.error("Failed to fulfill service:", err)
      setError("Failed to fulfill service. Please try again.")
      toast.error("Failed to fulfill service. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) onClose() // Close only on backdrop click
      }}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <h2 className="text-xl font-bold mb-4 text-green-900">Confirm Fulfillment</h2>

        <p className="mb-2">
          Are you sure you want to fulfill this service for the orphanage:{" "}
          <span className="font-semibold">{service.orphanInfo?.orgName || "N/A"}</span>?
        </p>
        <p className="mb-4">
          Location: <strong>{service.orphanInfo?.city || "N/A"}</strong>
        </p>

        <textarea
          placeholder="Add a donation note (required)"
          className="w-full p-2 border border-gray-300 rounded mb-4 resize-none"
          rows={3}
          value={donationNote}
          onChange={(e) => setDonationNote(e.target.value)}
          disabled={processing}
        />

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-4">
          <button
            onClick={fulfillService}
            className={`px-4 py-2 rounded text-white ${
              processing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={processing}
          >
            {processing ? "Processing..." : "Confirm"}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
            disabled={processing}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
