"use client";
import React, { useEffect, useState } from "react";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  increment,
  query,
  where,
} from "firebase/firestore";

const ConfirmFund = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const orphanageId = auth.currentUser?.uid;
        console.log("👤 Logged in Orphanage UID:", orphanageId);

        const fundraiserQuery = query(
          collection(firestore, "fundraisers"),
          where("orphanageId", "==", orphanageId)
        );
        const fundraisersSnap = await getDocs(fundraiserQuery);
        const donationsList = [];

        for (const fundraiserDoc of fundraisersSnap.docs) {
          const fundraiserId = fundraiserDoc.id;
          console.log("📁 Found Fundraiser:", fundraiserId);

          const donationsRef = collection(firestore, `fundraisers/${fundraiserId}/donations`);
          const donationsSnap = await getDocs(donationsRef);

          donationsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            donationsList.push({
              ...data,
              fundraiserId,
              donationId: docSnap.id,
            });
          });
        }

        console.log("✅ Total Donations Fetched:", donationsList.length);
        setDonations(donationsList);
      } catch (err) {
        console.error("❌ Error fetching donations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const handleApprove = async (donation) => {
    try {
      console.log("🟢 Approving:", donation.donationId);

      const donationRef = doc(
        firestore,
        `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`
      );
      const fundraiserRef = doc(firestore, "fundraisers", donation.fundraiserId);

      await updateDoc(donationRef, { status: "approved" });
      await updateDoc(fundraiserRef, {
        raisedAmount: increment(Number(donation.amount)),
      });

      setDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId
            ? { ...d, status: "approved" }
            : d
        )
      );
    } catch (err) {
      console.error("❌ Approval error:", err);
    }
  };

  const handleReject = async (donation) => {
    try {
      console.log("🔴 Rejecting:", donation.donationId);

      const donationRef = doc(
        firestore,
        `fundraisers/${donation.fundraiserId}/donations/${donation.donationId}`
      );
      await updateDoc(donationRef, { status: "rejected" });

      setDonations((prev) =>
        prev.map((d) =>
          d.donationId === donation.donationId
            ? { ...d, status: "rejected" }
            : d
        )
      );
    } catch (err) {
      console.error("❌ Rejection error:", err);
    }
  };

  const filtered = donations.filter((d) => d.status === activeTab);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Fundraiser Donations</h2>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {["pending", "approved", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading donations...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No {activeTab} donations found.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((donation) => (
            <li
              key={donation.donationId}
              className="p-4 bg-white shadow rounded border flex flex-col sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-gray-800 font-medium">
                  Donor ID: {donation.donorId}
                </p>
                <p>Amount: Rs. {donation.amount}</p>
                <p>Status: {donation.status}</p>
              </div>

              {donation.status === "pending" && (
                <div className="flex gap-3 mt-4 sm:mt-0">
                  <button
                    onClick={() => handleApprove(donation)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(donation)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConfirmFund;
