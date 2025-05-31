"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { withAuth } from "@/lib/withAuth";

function FundRaiserCard({
  id,
  bgImage,
  title,
  description,
  raisedAmount,
  totalAmount,
  filledhr,
  orphanageName,
  user, // injected by withAuth HOC
}) {
  const router = useRouter();
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [donating, setDonating] = useState(false);

  // Show modal only if user role is Donor
  const checkDonorAccess = () => {
    if (!user || user.role !== "Donor") {
      alert("Only donors are allowed to donate.");
      return;
    }
    setShowDonateModal(true);
  };

  const closeModal = () => {
    setShowDonateModal(false);
    setDonationAmount("");
  };

  useEffect(() => {
    if (showDonateModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDonateModal]);

  const handleDonate = async () => {
    if (!donationAmount || Number(donationAmount) <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }
    setDonating(true);
    try {
      const donationRef = doc(firestore, "fundraisers", id);
      await updateDoc(donationRef, {
        raisedAmount: increment(Number(donationAmount)),
      });
      alert("Thank you for your donation!");
      closeModal();
    } catch (error) {
      alert("Donation failed: " + error.message);
    } finally {
      setDonating(false);
    }
  };

  const DonateModal = () => {
    if (typeof window === "undefined") return null;
    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-modal-title"
        onClick={closeModal}
      >
        <div
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeModal}
            aria-label="Close Modal"
            className="absolute top-3 right-3 text-gray-700 hover:text-gray-900 text-xl font-bold leading-none"
          >
            &times;
          </button>

          <h2 id="donate-modal-title" className="text-xl font-bold mb-4">
            Donate to Fundraiser
          </h2>

          <label htmlFor="donationAmount" className="block mb-1 font-semibold">
            Donation Amount
          </label>
          <input
            id="donationAmount"
            type="number"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          />

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
              className="h-full bg-gradient-to-r from-green-500 to-green-700 transition-width duration-500 ease-in-out"
              style={{ width: `${filledhr}%` }}
            />
          </div>

          <div className="text-sm text-gray-700 font-semibold">
            Raised <span className="text-green-700">Rs. {raisedAmount}</span> of Rs. {totalAmount}
          </div>

          <button
            type="button"
            onClick={checkDonorAccess}
            className="mt-4 w-full py-3 rounded-xl text-white font-semibold bg-green-600 hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors duration-200"
          >
            Donate
          </button>
        </div>
      </div>

      {showDonateModal && <DonateModal />}
    </>
  );
}

export default withAuth(FundRaiserCard, ["Donor"]);
