"use client";
import { useState, useEffect } from "react";
import React from "react";

import PaymentModule from "../payment/paymentModule";
import { firestore } from "@/lib/firebase";
import {
  doc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { createPortal } from "react-dom";

// Amount Input Modal Component with Portal
const AmountInputModal = ({
  isOpen,
  onClose,
  onConfirm,
  orphanageName,
  totalAmount,
  raisedAmount,
}) => {
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState(null);

  // Calculate remaining amount
  const remainingAmount = Math.max(0, totalAmount - (raisedAmount || 0));
  const isCompleted = remainingAmount <= 0;

  // Update calculatePredefinedAmounts function:
  const calculatePredefinedAmounts = () => {
    if (isCompleted) return []; // No amounts if completed

    const percentages = [2.5, 5, 10, 20, 30, 40];
    const amounts = percentages
      .map((percentage) => {
        const amount = Math.round((totalAmount * percentage) / 100);
        return amount;
      })
      .filter((amount) => amount >= 100 && amount <= remainingAmount); // Filter by remaining amount

    // Remove duplicates and sort
    const uniqueAmounts = [...new Set(amounts)].sort((a, b) => a - b);

    // If we have less than 4 amounts, add some standard ones
    if (uniqueAmounts.length < 4) {
      const standardAmounts = [100, 500, 1000, 2000];
      standardAmounts.forEach((amt) => {
        if (amt <= remainingAmount && !uniqueAmounts.includes(amt)) {
          uniqueAmounts.push(amt);
        }
      });
      uniqueAmounts.sort((a, b) => a - b);
    }

    return uniqueAmounts.slice(0, 6); // Maximum 6 amounts
  };

  const predefinedAmounts = calculatePredefinedAmounts();

  const handleClose = () => {
    // Reset states when closing
    setAmount("");
    setCustomAmount("");
    setSelectedAmount(null);
    onClose();
  };

  // Update handleConfirm function:
  const handleConfirm = () => {
    const finalAmount =
      selectedAmount === "custom"
        ? Number.parseInt(customAmount)
        : selectedAmount;

    if (!finalAmount || finalAmount < 100) {
      alert("Minimum donation amount is Rs. 100");
      return;
    }

    if (finalAmount > remainingAmount) {
      alert(
        `Maximum donation amount is Rs. ${remainingAmount.toLocaleString()} (remaining amount)`
      );
      return;
    }

    onConfirm(finalAmount);
    handleClose();
  };

  const handleAmountSelect = (value) => {
    setSelectedAmount(value);
    if (value !== "custom") {
      setCustomAmount("");
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99998] bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: "1rem",
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 99999,
          maxWidth: "28rem",
          width: "100%",
          margin: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Enter Donation Amount</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Add remaining amount display in modal: */}
          <p className="text-gray-600 mb-4">
            How much would you like to donate to{" "}
            <strong>{orphanageName}</strong>?
            <br />
            <span className="text-sm text-green-600">
              Remaining: Rs. {remainingAmount.toLocaleString()} of Rs.{" "}
              {totalAmount.toLocaleString()}
            </span>
          </p>

          {/* Predefined Amounts */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {predefinedAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => handleAmountSelect(amt)}
                className={`p-3 rounded-md border-2 transition-colors ${
                  selectedAmount === amt
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                Rs. {amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <button
              onClick={() => handleAmountSelect("custom")}
              className={`w-full p-3 rounded-md border-2 transition-colors mb-3 ${
                selectedAmount === "custom"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-green-300"
              }`}
            >
              Custom Amount
            </button>

            {selectedAmount === "custom" && (
              <input
                type="number"
                placeholder={`Enter amount (max Rs. ${remainingAmount.toLocaleString()})`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                min="100"
                max={remainingAmount}
                autoFocus
              />
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                !selectedAmount ||
                (selectedAmount === "custom" && !customAmount)
              }
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" && document.body
    ? createPortal(modalContent, document.body)
    : null;
};

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
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState(0);
  const [donating, setDonating] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [raisedAmount, setRaisedAmount] = useState(initialRaised);
  const [showFullDesc, setShowFullDesc] = useState(false);

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

  // Reset all states when modals close
  const resetAllStates = () => {
    setShowAmountModal(false);
    setShowPaymentModal(false);
    setDonationAmount(0);
  };

  const closeAmountModal = () => {
    setShowAmountModal(false);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    // Don't reset donation amount here, in case user wants to try again
  };

  // Step 1: Show amount input modal
  const handleDonate = () => {
    setShowAmountModal(true);
  };

  // Step 2: Amount confirmed, show payment modal
  const handleAmountConfirm = (amount) => {
    setDonationAmount(amount);
    setShowAmountModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    setDonating(true);
    try {
      console.log("Payment successful:", paymentData);

      // Save donation to Firestore
      await addDoc(collection(firestore, "fundraisers", id, "donations"), {
        donorId: user?.uid || "anonymous",
        donorEmail: user?.email || "",
        amount: paymentData.amount,
        status: "completed",
        paymentMethod: paymentData.bank.name,
        transactionId: paymentData.transactionId,
        timestamp: serverTimestamp(),
      });

      // Update fundraiser raised amount
      const fundraiserRef = doc(firestore, "fundraisers", id);
      const fundraiserSnap = await getDoc(fundraiserRef);
      if (fundraiserSnap.exists()) {
        const currentData = fundraiserSnap.data();
        const newRaisedAmount =
          (currentData.raisedAmount || 0) + Number(paymentData.amount);
        await updateDoc(fundraiserRef, {
          raisedAmount: newRaisedAmount,
        });
      }

      alert(
        `✅ Thank you for your donation of Rs. ${Number(
          paymentData.amount
        ).toLocaleString()}!`
      );

      // Reset all states after successful payment
      resetAllStates();
    } catch (err) {
      console.error("Donation failed:", err);
      alert(
        "Payment successful, but error saving donation. Please contact support."
      );
    } finally {
      setDonating(false);
    }
  };

  // Calculate remaining amount and completion status
  const remainingAmount = Math.max(0, totalAmount - raisedAmount);
  const isCompleted = remainingAmount <= 0;
  const progressPercentage = Math.min((raisedAmount / totalAmount) * 100, 100);

  return (
    <>
      <div className="w-full sm:w-[340px] min-h-[480px] bg-white rounded-sm shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out flex flex-col justify-between mb-10">
        <div>
          <div className="relative h-56 overflow-hidden rounded-t-sm shadow-inner">
            <img
              src={bgImage || "/placeholder.svg"}
              alt={title}
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-300 ease-in-out"
              loading="lazy"
            />
          </div>
          <div className="p-6 flex flex-col gap-3 flex-grow">
            <h2 className="text-2xl font-extrabold text-gray-900 line-clamp-2">
              {title}
            </h2>
            <p className="text-sm text-gray-600">
              {showFullDesc || description.length <= 40
                ? description
                : `${description.slice(0, 40)}...`}
            </p>
            {description.length > 40 && (
              <span
                className="text-green-600 text-sm cursor-pointer hover:underline"
                onClick={() => setShowFullDesc(!showFullDesc)}
              >
                {showFullDesc ? "Show less" : "Read more"}
              </span>
            )}
          </div>
        </div>
        <div className="p-6 pt-0">
          {orphanageName && (
            <p className="text-sm font-semibold text-gray-500 mb-2">
              ORPHANAGE: <span className="font-thin">{orphanageName}</span>
            </p>
          )}
          {/* Update progress bar: */}
          <div className="w-full h-2 bg-gray-300 rounded-md overflow-hidden shadow-inner mb-4">
            <div
              className={`h-full transition-all duration-500 ease-in-out ${
                isCompleted
                  ? "bg-gradient-to-r from-green-500 to-green-700"
                  : "bg-gradient-to-r from-green-400 to-green-600"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {/* Update progress display: */}
          <div className="text-sm text-gray-700 font-semibold mb-6">
            Raised{" "}
            <span className="text-green-700">
              Rs. {raisedAmount.toLocaleString()}
            </span>{" "}
            of Rs. {totalAmount.toLocaleString()}
            {!isCompleted && (
              <div className="text-xs text-gray-500 mt-1">
                Remaining: Rs. {remainingAmount.toLocaleString()}
              </div>
            )}
            {isCompleted && (
              <div className="text-xs text-green-600 mt-1 font-semibold">
                🎉 Target Achieved!
              </div>
            )}
          </div>
          {/* Update donate button: */}
          <button
            onClick={handleDonate}
            disabled={isCompleted}
            className={`w-full py-3 rounded-md font-semibold transition ${
              isCompleted
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
            }`}
          >
            {isCompleted ? "✅ Completed" : "Donate"}
          </button>
        </div>
      </div>

      {/* Amount Input Modal */}
      {/* Pass remaining amount to AmountInputModal: */}
      <AmountInputModal
        isOpen={showAmountModal}
        onClose={closeAmountModal}
        onConfirm={handleAmountConfirm}
        orphanageName={orphanageName}
        totalAmount={totalAmount}
        raisedAmount={raisedAmount}
      />

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModule
          isOpen={showPaymentModal}
          onClose={closePaymentModal}
          amount={donationAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};

export default FundRaiserCard;
