// ServiceFulfillModal.jsx
"use client";

import { useState } from "react";
import { firestore } from "@/lib/firebase";
import { updateDoc, doc, addDoc, collection } from "firebase/firestore";

export default function ServiceFulfillModal({ service, user, onFulfill }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [donationNote, setDonationNote] = useState("");
  const [error, setError] = useState("");

  const openModal = () => setModalOpen(true);
  const closeModal = () => !processing && setModalOpen(false);

  const fulfillService = async () => {
    if (!user || !user.uid) {
      alert("Please login as donor to fulfill this service.");
      return;
    }

    if (!donationNote.trim()) {
      setError("Please enter a donation note.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Create donation linked to this service and orphanage
      await addDoc(collection(firestore, "donations"), {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: service.orphanageId,
        serviceId: service.id,
        donationNote,
        status: "Pending",
        timestamp: new Date(),
      });

      // Update service status to In Progress with only allowed fields
      await updateDoc(doc(firestore, "services", service.id), {
        status: "In Progress",
        lastFulfillmentNote: donationNote,
        lastFulfillmentTime: new Date().toISOString(),
      });

      alert("Service fulfillment submitted successfully!");
      setDonationNote("");
      setModalOpen(false);
      if (onFulfill) onFulfill(); // refresh parent data
    } catch (err) {
      console.error("Failed to fulfill service:", err);
      setError("Failed to fulfill service. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        disabled={service.status !== "Pending"}
        className={`bg-green-600 text-white font-semibold px-5 py-2 rounded-md transition ${
          service.status !== "Pending" ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
        }`}
      >
        Fulfill
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !processing) closeModal();
          }}
        >
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
            <h2 className="text-xl font-bold mb-4 text-green-900">Confirm Fulfillment</h2>

            <p className="mb-2">
              Are you sure you want to fulfill this service for the orphanage:{" "}
              <span className="font-semibold">{service.orphanInfo?.orgName || "N/A"}</span>?
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
                onClick={closeModal}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                disabled={processing}
              >
                Cancel
              </button>
             
            </div>
          </div>
        </div>
      )}
    </>
  );
}
