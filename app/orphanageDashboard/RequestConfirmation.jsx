'use client';

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  where,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";

const PAGE_SIZE = 5;

export default function RequestConfirmations({ activeStatus }) {
  const [requests, setRequests] = useState([]);
  const [requestDonations, setRequestDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donorNames, setDonorNames] = useState({}); // donorId => donorName

  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchRequestsAndDonations = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch requests by orphanageId = current user
        const reqSnap = await getDocs(
          query(collection(firestore, "requests"), where("orphanageId", "==", user.uid))
        );
        const reqList = reqSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRequests(reqList);

        // Fetch donations related to orphanage requests
        const dSnap = await getDocs(
          query(collection(firestore, "donations"), where("orphanageId", "==", user.uid))
        );
        const allDonations = dSnap.docs.map((doc) => ({
          ...doc.data(),
          donationId: doc.id,
          from: "request",
        }));
        const reqDonations = allDonations.filter(d => d.requestId);
        setRequestDonations(reqDonations);

        // Fetch donor names in batch
        const uniqueDonorIds = [...new Set(reqDonations.map(d => d.donorId))];
        const donorNameMap = {};
        await Promise.all(uniqueDonorIds.map(async (donorId) => {
          try {
            const userDoc = await getDoc(doc(firestore, "users", donorId));
            donorNameMap[donorId] = userDoc.exists() && userDoc.data().name
              ? userDoc.data().name
              : null;
          } catch {
            donorNameMap[donorId] = null;
          }
        }));
        setDonorNames(donorNameMap);
      } finally {
        setLoading(false);
      }
    };
    fetchRequestsAndDonations();
  }, []);

  // Status badge helper
  const renderStatusBadge = (status) => {
    const lower = (status || "").toLowerCase();
    let bgClass = "bg-gray-400 text-white";

    if (["pending", "pending approval", "in progress"].includes(lower)) {
      bgClass = "bg-yellow-400 text-yellow-900";
    } else if (["approved", "fulfilled", "confirmed"].includes(lower)) {
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

  // Filter by status
  const matchesStatus = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    if (activeStatus === "pending") return ["pending", "pending approval", "in progress"].includes(s);
    if (activeStatus === "approved") return ["approved", "fulfilled", "confirmed"].includes(s);
    if (activeStatus === "rejected") return s === "rejected";
    return false;
  };

  const filteredDonations = requestDonations.filter(d =>
    matchesStatus(d.status || (d.confirmed ? "approved" : "pending"))
  );

  const getPageItems = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const paginatedDonations = getPageItems(filteredDonations, page);

  const handleConfirmDonation = async (donation) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Update donation status
      await updateDoc(doc(firestore, "donations", donation.donationId), { confirmed: true, status: "approved" });

      // Update request status to "Fulfilled"
      if (donation.requestId) {
        await updateDoc(doc(firestore, "requests", donation.requestId), { status: "Fulfilled" });
      }

      setRequestDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId ? { ...d, status: "approved", confirmed: true } : d
        )
      );
    } catch (err) {
      console.error("Approval error", err);
    }
  };

  const handleRejectDonation = async (donation) => {
    try {
      // Update donation status
      await updateDoc(doc(firestore, "donations", donation.donationId), { confirmed: false, status: "rejected" });

      // Optionally leave request status unchanged (still pending)

      setRequestDonations((prev) =>
        prev.map((d) => (d.donationId === donation.donationId ? { ...d, status: "rejected" } : d))
      );
    } catch (err) {
      console.error("Rejection error", err);
    }
  };

  if (loading) return <p>Loading Requests...</p>;

  return (
    <section className="mb-10">
      <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2 text-gray-900">
        Requests
      </h3>
      {paginatedDonations.length === 0 ? (
        <p className="text-gray-500">No request donations found.</p>
      ) : (
        <ul className="space-y-6">
          {paginatedDonations.map((donation) => {
            const currentStatus = (donation.status || (donation.confirmed ? "approved" : "pending")).toLowerCase();
            return (
              <li
                key={donation.donationId}
                className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-gray-800">
                  <p className="font-semibold">
                    Request Donation by Donor: {donorNames[donation.donorId] || donation.donorId}
                  </p>
                  {donation.amount && <p>Amount: Rs. {donation.amount}</p>}
                  {donation.numClothes && <p>Clothes: {donation.numClothes}</p>}
                  {donation.foodDescription && <p>Food: {donation.foodDescription}</p>}
                  {donation.description && <p>Note: {donation.description}</p>}
                  <p>
                    Status: {renderStatusBadge(donation.status || (donation.confirmed ? "approved" : "pending"))}
                  </p>
                </div>

                {/* Show buttons only if status is pending */}
                {currentStatus === "pending" && (
                  <div className="flex gap-4 mt-6 sm:mt-0">
                    <button
                      onClick={() => handleConfirmDonation(donation)}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectDonation(donation)}
                      className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} totalPages={Math.ceil(filteredDonations.length / PAGE_SIZE)} onPageChange={setPage} />
    </section>
  );
}

// Pagination component reused
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
