"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { firestore } from "@/lib/firebase";
import {
  doc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { withAuth } from "@/lib/withAuth";
const FundRaiserCard = ({
  id,
  bgImage,
  title,
  description,
  raisedAmount: initialRaised,
  totalAmount,
  orphanageName,
  user,
}) => {
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [donating, setDonating] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [raisedAmount, setRaisedAmount] = useState(initialRaised);
  const [amountError, setAmountError] = useState("");

 useEffect(() => {
  if (user?.uid) {
    getDoc(doc(firestore, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        setUserRole(snap.data().userType);
      }
    });
  }
}, [user]);


  useEffect(() => {
    const unsub = onSnapshot(doc(firestore, "fundraisers", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRaisedAmount(data.raisedAmount || 0);
      }
    });
    return () => unsub();
  }, [id]);

  const closeModal = () => {
    setShowDonateModal(false);
    setDonationAmount("");
    setAmountError("");
  };

  const handleDonate = async () => {
    if (!user?.uid) {
      alert("Please login as donor to donate.");
      return;
    }

    if (userRole !== "Donor") {
      alert("Only donors can make donations.");
      return;
    }

    const trimmed = donationAmount.trim();
    const amountNum = Number(trimmed);

    if (!trimmed || isNaN(amountNum)) {
      setAmountError("Please enter a valid numeric amount.");
      return;
    }

    if (amountNum <= 0 || /^0\d+/.test(trimmed)) {
      setAmountError("Amount must be greater than zero, no leading zeros.");
      return;
    }

    if (amountNum > 1000000) {
      setAmountError("Amount must be ≤ 1,000,000.");
      return;
    }

    setAmountError("");
    setDonating(true);

    try {
      await addDoc(collection(firestore, "fundraisers", id, "donations"), {
        donorId: user.uid,
        amount: amountNum,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      alert("✅ Thank you! Awaiting orphanage confirmation.");
      closeModal();
    } catch (err) {
      console.error("Donation failed:", err);
      setAmountError("Donation failed: " + err.message);
    } finally {
      setDonating(false);
    }
  };

  const filledhr = Math.min((raisedAmount / totalAmount) * 100, 100);

  const DonateModal = () => {
    if (typeof window === "undefined") return null;
    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4"
        onClick={closeModal}
      >
        <div
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeModal}
            className="absolute top-3 right-3 text-gray-700 hover:text-gray-900 text-xl font-bold"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-4">Donate to Fundraiser</h2>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter amount (₹1 to ₹1,000,000)"
            value={donationAmount}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setDonationAmount(val);
              setAmountError("");
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {amountError && <p className="text-sm text-red-600 mt-1">{amountError}</p>}
          <button
            onClick={handleDonate}
            disabled={donating}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition"
          >
            {donating ? "Processing..." : "Donate Now"}
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <div className="w-full sm:w-[340px] bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out">
        <div className="relative h-64 overflow-hidden rounded-t-3xl shadow-inner">
          <img
            src={bgImage}
            alt={title}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-300 ease-in-out"
            loading="lazy"
          />
        </div>

        <div className="p-6 flex flex-col gap-3">
          <h2 className="text-2xl font-extrabold text-gray-900 line-clamp-2">{title}</h2>
          <p className="text-sm text-gray-600 line-clamp-3">{description}</p>

          {orphanageName && (
            <p className="text-sm font-semibold text-gray-500">
              ORPHANAGE: <span className="font-thin">{orphanageName}</span>
            </p>
          )}

          <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-700 transition-all duration-500 ease-in-out"
              style={{ width: `${filledhr}%` }}
            />
          </div>

          <div className="text-sm text-gray-700 font-semibold">
            Raised <span className="text-green-700">Rs. {raisedAmount}</span> of Rs. {totalAmount}
          </div>

          <button
            onClick={() => setShowDonateModal(true)}
            className="mt-4 w-full py-3 rounded-xl text-white font-semibold bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
          >
            Donate
          </button>
        </div>
      </div>

      {showDonateModal && <DonateModal />}
    </>
  );
};

export default FundRaiserCard;
