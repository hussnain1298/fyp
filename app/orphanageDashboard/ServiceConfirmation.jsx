// ServiceConfirmations.jsx
"use client";

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import { collection, query, getDocs, where, updateDoc, doc } from "firebase/firestore";

const PAGE_SIZE = 5;

export default function ServiceConfirmations({ activeStatus }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // Fetch services for orphanage with relevant statuses
        const serviceQuery = query(
          collection(firestore, "services"),
          where("orphanageId", "==", user.uid),
          where("status", "in", [ "In Progress"])
        );
        const serviceSnap = await getDocs(serviceQuery);
        const serviceList = serviceSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(serviceList);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Status badge helper
  const renderStatusBadge = (status) => {
    const lower = (status || "").toLowerCase();
    let bgClass = "bg-gray-400 text-white";

    if (["pending", "in progress"].includes(lower)) {
      bgClass = "bg-yellow-400 text-yellow-900";
    } else if (["fulfilled"].includes(lower)) {
      bgClass = "bg-green-600 text-white";
    } else if (lower === "rejected") {
      bgClass = "bg-red-600 text-white";
    }

    return (
      <span
        className={`inline-block px-3 py-1 rounded-full font-semibold text-xs ${bgClass} w-max`}
      >
        {status}
      </span>
    );
  };

  // Filter by activeStatus prop
  const matchesStatus = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    if (activeStatus === "pending") return ["pending", "in progress"].includes(s);
    if (activeStatus === "approved") return ["fulfilled"].includes(s);
    if (activeStatus === "rejected") return s === "rejected";
    return false;
  };

  const filteredServices = services.filter((s) => matchesStatus(s.status));

  const getPageItems = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const paginatedServices = getPageItems(filteredServices, page);

  // Orphanage approves → mark as "Fulfilled"
  const handleApproveService = async (serviceId) => {
    try {
      await updateDoc(doc(firestore, "services", serviceId), {
        status: "Fulfilled",
      });
      setServices((prev) =>
        prev.map((svc) =>
          svc.id === serviceId ? { ...svc, status: "Fulfilled" } : svc
        )
      );
    } catch (err) {
      console.error("Failed to approve service", err);
    }
  };

  // Orphanage rejects → reset to "Pending"
  const handleRejectService = async (serviceId) => {
    try {
      await updateDoc(doc(firestore, "services", serviceId), {
        status: "Pending",
      });
      setServices((prev) =>
        prev.map((svc) =>
          svc.id === serviceId ? { ...svc, status: "Pending" } : svc
        )
      );
    } catch (err) {
      console.error("Failed to reject service", err);
    }
  };

  if (loading) return <p>Loading Services...</p>;

  return (
    <section className="mb-10">
      <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2 text-gray-900">
        Services
      </h3>
      {paginatedServices.length === 0 ? (
        <p className="text-gray-500">No services found.</p>
      ) : (
        <ul className="space-y-6">
          {paginatedServices.map((service) => (
            <li
              key={service.id}
              className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row justify-between items-center"
            >
              <div className="flex flex-col gap-1 max-w-lg w-full">
                <h4 className="text-lg font-semibold text-green-900">{service.title}</h4>
                <p className="text-gray-700 mb-1 max-w-md">{service.description}</p>
                <p className="text-sm text-gray-600">
                  Last fulfillment note:{" "}
                  <span className="italic">{service.lastFulfillmentNote || "No notes"}</span>
                </p>
                {renderStatusBadge(service.status)}
              </div>

              {service.status?.toLowerCase() === "in progress" && (
                <div className="flex gap-4 mt-4 sm:mt-0 flex-shrink-0">
                  <button
                    onClick={() => handleApproveService(service.id)}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectService(service.id)}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={Math.ceil(filteredServices.length / PAGE_SIZE)}
        onPageChange={setPage}
      />
    </section>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center space-x-3 mt-6">
      {[...Array(totalPages)].map((_, i) => {
        const pageNum = i + 1;
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200 ${
              page === pageNum ? "bg-blue-600 text-white shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            aria-current={page === pageNum ? "page" : undefined}
          >
            {pageNum}
          </button>
        );
      })}
    </div>
  );
}
