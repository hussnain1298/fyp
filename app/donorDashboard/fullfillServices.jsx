"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

export default function FulfillServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const [donationNote, setDonationNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 6;
  const router = useRouter();

  const totalPages = Math.ceil(services.length / pageSize);
  const paginatedServices = services.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError("");
      try {
        const snap = await getDocs(collection(firestore, "services"));
        const raw = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((s) => s.status === "Pending");

        const orphanageIds = [...new Set(raw.map((s) => s.orphanageId).filter(Boolean))];
        let orphanageMap = {};

        if (orphanageIds.length) {
          const batches = [];
          while (orphanageIds.length) batches.push(orphanageIds.splice(0, 10));

          for (const batch of batches) {
            const orphanSnap = await getDocs(
              query(collection(firestore, "users"), where("__name__", "in", batch))
            );
            orphanSnap.forEach((doc) => {
              orphanageMap[doc.id] = doc.data();
            });
          }
        }

        const enriched = raw.map((s) => ({
          ...s,
          orphanInfo: orphanageMap[s.orphanageId] || {},
        }));

        setServices(enriched);
        setPage(1); // Reset page after load
      } catch (err) {
        setError("Failed to load services: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleFulfill = async (service) => {
    if (!auth.currentUser) {
      alert("Please log in to fulfill this service.");
      return;
    }
    setProcessing(true);
    try {
      await updateDoc(doc(firestore, "services", service.id), {
        status: "In Progress",
         

        lastFulfillmentNote: donationNote || null,
      });
      alert("Fulfillment submitted successfully!");
      setActiveModalId(null);
      setDonationNote("");
    } catch (err) {
      alert("Failed to fulfill: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto px-6 py-10 mt-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-2">SERVICES</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {loading && <p className="text-gray-500 text-center">Loading...</p>}

        <div className="mt-6 space-y-6">
          {paginatedServices.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No services available.</p>
          ) : (
            paginatedServices.map((service) => (
              <div key={service.id} className="bg-gray-100 p-6 rounded-lg shadow-md relative">
                <span className="absolute top-4 right-4 px-3 py-1 rounded text-white text-sm font-semibold bg-yellow-500">
                  {service.status}
                </span>

                <h3 className="text-xl font-bold text-gray-800">{service.title}</h3>
                <p className="text-gray-700 mt-2">{service.description}</p>
                <p className="mt-2 text-sm">
                  <strong>Orphanage:</strong> {service.orphanInfo?.orgName || "N/A"}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {service.orphanInfo?.city || "N/A"}
                </p>

                <div className="flex space-x-2">
                  <button
                    className="mt-4 px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700"
                    onClick={() => setActiveModalId(service.id)}
                  >
                    Fulfill
                  </button>
                </div>

                {activeModalId === service.id && (
                  <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
                      <h3 className="text-lg font-bold mb-4">Confirm Fulfillment</h3>
                      <p className="mb-2">
                        Are you sure you want to fulfill this service for Orphanage:{" "}
                        <strong>{service.orphanInfo?.orgName || "N/A"}</strong>?
                      </p>
                      <p className="mb-4">
                        Location: <strong>{service.orphanInfo?.city || "N/A"}</strong>
                      </p>

                      <textarea
                        value={donationNote}
                        onChange={(e) => setDonationNote(e.target.value)}
                        placeholder="Add a donation note (optional)"
                        className="w-full p-2 border border-gray-300 rounded mb-4 resize-none"
                        rows={3}
                        disabled={processing}
                      />

                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => handleFulfill(service)}
                          className={`px-4 py-2 rounded text-white ${
                            processing ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                          }`}
                          disabled={processing}
                        >
                          {processing ? "Processing..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setActiveModalId(null)}
                          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                          disabled={processing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-10 space-x-2">
            {Array.from({ length: totalPages }, (_, idx) => (
              <button
                key={idx + 1}
                onClick={() => setPage(idx + 1)}
                className={`px-4 py-2 rounded ${
                  page === idx + 1
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
