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

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      setError("");
      try {
        const serviceSnapshot = await getDocs(collection(firestore, "services"));
        const serviceList = serviceSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((service) => service.status === "Pending");

        const orphanageIds = [
          ...new Set(serviceList.map((s) => s.orphanageId).filter(Boolean)),
        ];

        let orphanageMap = {};
        if (orphanageIds.length > 0) {
          const batches = [];
          while (orphanageIds.length) {
            batches.push(orphanageIds.splice(0, 10));
          }

          orphanageMap = {};
          for (const batch of batches) {
            const orphanageQuery = query(
              collection(firestore, "users"),
              where("__name__", "in", batch)
            );
            const orphanageSnapshot = await getDocs(orphanageQuery);
            orphanageSnapshot.docs.forEach((doc) => {
              orphanageMap[doc.id] = doc.data();
            });
          }
        }

        const mergedServices = serviceList.map((service) => ({
          ...service,
          orphanInfo: orphanageMap[service.orphanageId] || null,
        }));

        setServices(mergedServices);
        setPage(1);
      } catch (err) {
        setError("Failed to load services: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  const handleFulfill = async (service) => {
    if (!auth.currentUser) {
      alert("Please log in as a donor to fulfill this service.");
      return;
    }
    setProcessing(true);
    try {
      const serviceRef = doc(firestore, "services", service.id);
      await updateDoc(serviceRef, {
        status: "In Progress",
        lastFulfillmentNote: donationNote || null,
      });
      alert("Service fulfillment submitted successfully!");
      setActiveModalId(null);
      setDonationNote("");
    } catch (err) {
      alert("Failed to fulfill service: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(services.length / pageSize);
  const paginatedServices = services.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6">SERVICES</h2>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6 space-y-6">
          {paginatedServices.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No services available.</p>
          ) : (
            paginatedServices.map((service) => (
              <div key={service.id} className="relative bg-gray-100 p-6 rounded-lg shadow-md">
                <span
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-sm font-semibold bg-yellow-500"
                >
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

                <div className="flex space-x-4 mt-6">
                  <button
                    className="px-5 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
                    onClick={() => setActiveModalId(service.id)}
                  >
                    Fulfill
                  </button>
                </div>

                {activeModalId === service.id && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
                      <h2 className="text-xl font-bold mb-4 text-green-900">Confirm Fulfillment</h2>

                      <p className="mb-2">
                        Are you sure you want to fulfill this service for the orphanage: {" "}
                        <span className="font-semibold">{service.orphanInfo?.orgName || "N/A"}</span>?
                      </p>
                      <p className="mb-4">
                        Location: <span className="font-semibold">{service.orphanInfo?.city || "N/A"}</span>
                      </p>

                      <textarea
                        placeholder="Add a donation note (optional)"
                        className="w-full p-2 border border-gray-300 rounded mb-4 resize-none"
                        rows={3}
                        value={donationNote}
                        onChange={(e) => setDonationNote(e.target.value)}
                        disabled={processing}
                      />

                      <div className="flex justify-end gap-4">
                        <button
                          onClick={() => !processing && setActiveModalId(null)}
                          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
                          disabled={processing}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleFulfill(service)}
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
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-2">
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-4 py-2 rounded ${
                    page === pageNum
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
