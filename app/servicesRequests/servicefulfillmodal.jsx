"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";

function ServiceFulfillModal({ service, user, onFulfill }) {
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

    setProcessing(true);
    setError("");

    try {
      // Create a donation linked to this service and orphanage
      await addDoc(collection(firestore, "donations"), {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: service.orphanageId,
        serviceId: service.id,
        donationNote,
        status: "Pending",
        timestamp: new Date(),
      });

      // Update service status to In Progress (donor fulfillment initiated)
      const serviceRef = doc(firestore, "services", service.id);
      await updateDoc(serviceRef, {
        status: "In Progress",
        lastFulfillmentNote: donationNote,
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
              placeholder="Add a donation note (optional)"
              className="w-full p-2 border border-gray-300 rounded mb-4 resize-none"
              rows={3}
              value={donationNote}
              onChange={(e) => setDonationNote(e.target.value)}
              disabled={processing}
            />

            {error && <p className="text-red-600 mb-3">{error}</p>}

            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={fulfillService}
                className={`px-4 py-2 rounded text-white ${
                  processing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={processing}
              >
                {processing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Fetch service and orphanage info
  const fetchService = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const docRef = doc(firestore, "services", id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setError("Service not found.");
        setLoading(false);
        return;
      }
      const serviceData = { id: docSnap.id, ...docSnap.data() };

      // Fetch orphanage info
      if (serviceData.orphanageId) {
        const orphanRef = doc(firestore, "users", serviceData.orphanageId);
        const orphanSnap = await getDoc(orphanRef);
        serviceData.orphanInfo = orphanSnap.exists() ? orphanSnap.data() : null;
      }

      setService(serviceData);
    } catch (e) {
      console.error(e);
      setError("Failed to load service.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  useEffect(() => {
    const storedUser = localStorage.getItem("userSession");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (!service) return null;

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-10 relative">
      <h1 className="text-4xl font-bold mb-6 text-green-900">{service.title}</h1>
      <p className="mb-6 text-lg text-green-800">{service.description}</p>

      <div className="mb-6 text-green-700 space-y-2">
        <p>
          <span className="font-semibold">Orphanage:</span> {service.orphanInfo?.orgName || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Location:</span> {service.orphanInfo?.city || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Status:</span>{" "}
          <span
            className={`inline-block px-3 py-1 rounded-full text-white ${
              service.status === "Pending"
                ? "bg-yellow-500"
                : service.status === "In Progress"
                ? "bg-blue-600"
                : "bg-green-600"
            }`}
          >
            {service.status}
          </span>
        </p>
      </div>

      <ServiceFulfillModal service={service} user={user} onFulfill={fetchService} />
    </main>
  );
}
