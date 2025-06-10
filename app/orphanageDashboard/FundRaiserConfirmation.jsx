"use client";

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  where,
  updateDoc,
  doc,
  increment,
} from "firebase/firestore";

const PAGE_SIZE = 5;

export default function FundraiserConfirmations({ activeStatus }) {
  const [fundraiserDonations, setFundraiserDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchFundraiserDonations = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const fundraiserQuery = query(
          collection(firestore, "fundraisers"),
          where("orphanageId", "==", user.uid)
        );
        const fundraisersSnap = await getDocs(fundraiserQuery);
        const fDonations = [];
        for (const f of fundraisersSnap.docs) {
          const fDonSnap = await getDocs(
            collection(firestore, `fundraisers/${f.id}/donations`)
          );
          fDonSnap.forEach((d) => {
            const donation = d.data();
            if (matchesStatus(donation.status)) {
              fDonations.push({
                ...donation,
                fundraiserId: f.id,
                donationId: d.id,
                from: "fundraiser",
              });
            }
          });
        }
        setFundraiserDonations(fDonations);
      } finally {
        setLoading(false);
      }
    };
    fetchFundraiserDonations();
  }, [activeStatus]);

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

  const matchesStatus = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    if (activeStatus === "pending")
      return ["pending", "pending approval", "in progress"].includes(s);
    if (activeStatus === "approved")
      return ["approved", "fulfilled", "confirmed"].includes(s);
    if (activeStatus === "rejected") return s === "rejected";
    return false;
  };

  const getPageItems = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const paginatedDonations = getPageItems(fundraiserDonations, page);

  const handleConfirmDonation = async (donation) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(
        doc(
          firestore,
          `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`
        ),
        { status: "approved" }
      );
      await updateDoc(doc(firestore, "fundraisers", donation.fundraiserId), {
        raisedAmount: increment(Number(donation.amount)),
      });

      setFundraiserDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId
            ? { ...d, status: "approved" }
            : d
        )
      );
    } catch (err) {
      console.error("Approval error", err);
    }
  };

  const handleRejectDonation = async (donation) => {
    try {
      await updateDoc(
        doc(
          firestore,
          `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`
        ),
        { status: "rejected" }
      );
      setFundraiserDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId
            ? { ...d, status: "rejected" }
            : d
        )
      );
    } catch (err) {
      console.error("Rejection error", err);
    }
  };

  if (loading) return <p>Loading Fundraisers...</p>;

  return (
    <section>
      <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2 text-gray-900">
        Fund Raise
      </h3>
      {paginatedDonations.length === 0 ? (
        <p className="text-gray-500">No fundraise donations found.</p>
      ) : (
        <ul className="space-y-6">
          {paginatedDonations.map((donation) => (
            <li
              key={donation.donationId}
              className="p-6 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1 text-gray-800">
                <p className="font-semibold">Donor ID: {donation.donorId}</p>
                {donation.amount && <p>Amount: Rs. {donation.amount}</p>}
                {donation.numClothes && <p>Clothes: {donation.numClothes}</p>}
                {donation.foodDescription && <p>Food: {donation.foodDescription}</p>}
                {donation.description && <p>Note: {donation.description}</p>}
                <p>Status: {renderStatusBadge(donation.status)}</p>
              </div>

              {donation.status?.toLowerCase() === "pending" && (
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
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        totalPages={Math.ceil(fundraiserDonations.length / PAGE_SIZE)}
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
              page === pageNum
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
