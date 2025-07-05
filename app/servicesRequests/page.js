"use client";

import { useEffect, useState, useMemo } from "react";
import { firestore } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";

const workshopCategories = [
  "Academic Skills",
  "Technology & STEM",
  "Arts & Creativity",
  "Personal Development",
  "Career Training",
  "Social Learning",
];

export default function ServicesDisplay() {
  const [expandedDescriptions, setExpandedDescriptions] = useState([]);
  const toggleExpandDescription = (id) => {
    setExpandedDescriptions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [modalService, setModalService] = useState(null);
  const [donationNote, setDonationNote] = useState("");
  const pageSize = 6;

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError("");
      try {
        const orphanSnap = await getDocs(
          query(
            collection(firestore, "users"),
            where("userType", "==", "Orphanage")
          )
        );

        const orphanMap = {};
        orphanSnap.forEach((doc) => {
          orphanMap[doc.id] = doc.data();
        });

        const svcSnap = await getDocs(collection(firestore, "services"));
        const now = Date.now();

        const allServices = svcSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((svc) => {
            if (svc.status !== "Fulfilled") return true;
            if (!svc.fulfilledAt) return true;
            const fulfilledTime = svc.fulfilledAt.toMillis
              ? svc.fulfilledAt.toMillis()
              : new Date(svc.fulfilledAt).getTime();
            return now - fulfilledTime < 24 * 60 * 60 * 1000;
          })
          .filter((svc) => orphanMap[svc.orphanageId])
          .map((svc) => ({
            ...svc,
            orphanInfo: orphanMap[svc.orphanageId],
          }));

        setServices(allServices);
      } catch (err) {
        console.error("Failed to fetch services:", err);
        setError("Failed to load services. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return services;
    return services.filter((svc) => svc.title === selectedCategory);
  }, [services, selectedCategory]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const filteredServices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const handleFulfill = async () => {
    if (!modalService || !modalService.id) {
      alert("Invalid service. Please refresh and try again.");
      console.error("Missing modalService or ID", modalService);
      return;
    }

    if (!donationNote.trim()) {
      alert("Please enter a valid note.");
      return;
    }

    try {
      console.log("Fulfilling service:", modalService.id, donationNote);
      await updateDoc(doc(firestore, "services", modalService.id), {
        status: "In Progress", // ✅ allowed by rules
        lastFulfillmentNote: donationNote.trim(),
        lastFulfillmentTime: new Date().toISOString(),
      });

      alert(`Service "${modalService.title}" fulfilled!`);
      setModalService(null);
      setDonationNote("");
      setServices((prev) => prev.filter((svc) => svc.id !== modalService.id));
    } catch (err) {
      console.error("Fulfillment failed:", err);
      alert("Failed to fulfill the service. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 min-h-screen flex flex-col ">
      <h2 className="text-2xl justify-center font-bold text-gray-800 text-center py-12 md:text-3xl lg:text-4xl xl:text-5xl">
        SERVICES
      </h2>
      <p className="text-lg sm:text-xl text-gray-500 mt-4 text-center">
        Your support can bring hope and change to those in need...
      </p>

      <div className="flex justify-end items-center mb-2 mt-4">
        <select
          className="border border-gray-300 rounded px-4 py-2 text-sm hover:border-green-600 "
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="All">All Categories</option>
          {workshopCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <p className="text-center text-red-600 font-medium">{error}</p>
      ) : filteredServices.length === 0 ? (
        <p className="text-center text-gray-600 font-semibold">
          No services found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className="relative bg-white rounded-lg shadow-md p-6 flex flex-col justify-between min-h-[200px]"
            >
              <span
                className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold rounded ${
                  svc.status === "Pending"
                    ? "bg-yellow-400 text-yellow-800"
                    : svc.status === "In Progress"
                    ? "bg-blue-600 text-white"
                    : "bg-green-700 text-white"
                }`}
              >
                {svc.status || "Pending"}
              </span>

              <div className="flex flex-col flex-grow gap-2">
                <h3 className="text-xl font-bold text-green-800">
                  {svc.title}
                </h3>
                <div className="mt-auto">
                  <div className="text-gray-700 text-md flex-grow min-h-[10px] pb-6">
                    {svc.description.length > 70 ? (
                      <>
                        {expandedDescriptions.includes(svc.id)
                          ? svc.description
                          : `${svc.description.slice(0, 70)}... `}
                        <button
                          onClick={() => toggleExpandDescription(svc.id)}
                          className="text-green-600 ml-1 hover:underline text-sm font-medium"
                        >
                          {expandedDescriptions.includes(svc.id)
                            ? "Show Less"
                            : "Read More"}
                        </button>
                      </>
                    ) : (
                      svc.description
                    )}
                  </div>

                  <p className="text-sm text-gray-500">
                    <strong>Orphanage:</strong>{" "}
                    {svc.orphanInfo?.orgName || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Location:</strong> {svc.orphanInfo?.city || "N/A"}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
  onClick={() => svc.status !== "Fulfilled" && setModalService(svc)}
  disabled={svc.status === "Fulfilled"}
  className={`w-full py-2 rounded text-white transition-colors ${
    svc.status === "Fulfilled"
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-green-600 hover:bg-green-700"
  }`}
>
  {svc.status === "Fulfilled" ? "Fulfilled" : "Fulfill"}
</button>

              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-10 space-x-2">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 rounded ${
                  page === pageNum
                    ? "bg-green-600 text-white shadow"
                    : "bg-gray-200 text-green-800 hover:bg-gray-300"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
      )}

      {modalService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-green-900">
              Confirm Fulfillment
            </h2>
            <p className="mb-2">
              Are you sure you want to fulfill the service:{" "}
              <strong>{modalService.title}</strong> for Orphanage:{" "}
              <strong>{modalService.orphanInfo?.orgName || "N/A"}</strong>?
            </p>
            <p className="mb-4">
              Location:{" "}
              <strong>{modalService.orphanInfo?.city || "N/A"}</strong>
            </p>
            <textarea
              value={donationNote}
              onChange={(e) => setDonationNote(e.target.value)}
              placeholder="Add a donation note (optional)"
              className="w-full p-2 border border-gray-300 rounded mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleFulfill}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setModalService(null)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
