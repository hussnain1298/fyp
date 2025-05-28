'use client';

import { useState, useEffect } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const ConfirmedRequests = () => {
  const [donationsToConfirm, setDonationsToConfirm] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view requests.");
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(firestore, "donations"),
          where("orphanageId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const list = await Promise.all(
          querySnapshot.docs.map(async (donationDoc) => {
            const donationData = donationDoc.data();
            const requestRef = doc(firestore, "requests", donationData.requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) return null;

            const requestData = requestSnap.data();

            // Calculate totalConfirmed as sum of the totalDonated array
            const totalDonatedArray = Array.isArray(requestData.totalDonated)
              ? requestData.totalDonated.map((val) => Number(val) || 0)
              : typeof requestData.totalDonated === "number"
              ? [requestData.totalDonated]
              : [];

            const totalConfirmed = totalDonatedArray.reduce(
              (acc, val) => acc + val,
              0
            );

            return {
              donationId: donationDoc.id,
              confirmed: donationData.confirmed,
              requestId: donationData.requestId,
              donationClothesCount: donationData.numClothes,
              donationAmount: donationData.amount,
              donationType: donationData.donationType,
              foodDescription: donationData.foodDescription || "",
              requestTitle: requestData.title,
              requestDescription: requestData.description,
              totalRequested: requestData.quantity || 0, // changed here
              totalConfirmed,
              requestStatus: requestData.status || "Pending",
            };
          })
        );

        setDonationsToConfirm(list.filter(Boolean));
      } catch (err) {
        setError("Failed to load donations: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const handleConfirmDonation = async (
    donationId,
    requestId,
    donationClothesCount
  ) => {
    try {
      const donationRef = doc(firestore, "donations", donationId);
      await updateDoc(donationRef, { confirmed: true });

      const requestRef = doc(firestore, "requests", requestId);
      const requestSnap = await getDoc(requestRef);
      const requestData = requestSnap.data();

      // Get current totalDonated array or initialize
      const currentTotalDonatedArray = Array.isArray(requestData.totalDonated)
        ? requestData.totalDonated.map((val) => Number(val) || 0)
        : typeof requestData.totalDonated === "number"
        ? [requestData.totalDonated]
        : [];

      // Append new donation amount
      const updatedTotalDonatedArray = [
        ...currentTotalDonatedArray,
        Number(donationClothesCount) || 0,
      ];

      // Calculate total sum to check fulfillment
      const totalRequested = requestData.quantity || 0; // changed here
      const totalSum = updatedTotalDonatedArray.reduce((acc, val) => acc + val, 0);

      // Update request document with new array and status if fulfilled
      await updateDoc(requestRef, {
        totalDonated: updatedTotalDonatedArray,
        ...(totalSum >= totalRequested ? { status: "Fulfilled" } : {}),
      });

      // Update local state to reflect confirmed donation and updated total
      setDonationsToConfirm((prev) =>
        prev.map((item) =>
          item.donationId === donationId
            ? { ...item, confirmed: true, totalConfirmed: totalSum }
            : item
        )
      );
    } catch (err) {
      setError("Failed to confirm donation: " + err.message);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6 mt-10">
          Fulfilled Requests
        </h2>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}
        <div className="mt-6 space-y-4">
          {donationsToConfirm.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">
              No donations to confirm.
            </p>
          ) : (
            donationsToConfirm.map((item) => (
              <div
                key={item.donationId}
                className="bg-gray-100 p-5 rounded-lg shadow-md"
              >
                <h3 className="text-lg font-bold">{item.requestTitle}</h3>
                <p>{item.requestDescription}</p>
                <p className="mt-2 text-sm">
                  <strong>Status:</strong>{" "}
                  {item.confirmed ? "Confirmed" : "Pending"}
                </p>
                <p className="text-sm">Total Requested: {item.totalRequested}</p>
                <p className="text-sm">Total Confirmed: {item.totalConfirmed}</p>
                <p className="mt-2">
                  <strong>Donation Type:</strong> {item.donationType}
                </p>
                {item.donationType === "Clothes" && (
                  <p className="text-sm">
                    Clothes Donated: {item.donationClothesCount}
                  </p>
                )}
                {item.donationType === "Food" && (
                  <p className="text-sm">Food Description: {item.foodDescription}</p>
                )}
                {item.donationType === "Money" && (
                  <p className="text-sm">Amount: Rs {item.donationAmount}</p>
                )}
                {!item.confirmed && (
                  <button
                    onClick={() =>
                      handleConfirmDonation(
                        item.donationId,
                        item.requestId,
                        item.donationClothesCount
                      )
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4"
                  >
                    Confirm Donation
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmedRequests;
