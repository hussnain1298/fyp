"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import {
  FaCheckCircle,
  FaTshirt,
  FaUtensils,
  FaMoneyBillWave,
  FaArrowLeft,
} from "react-icons/fa";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function ReviewDonation({
  donationAmount,
  donationType,
  setShowReview,
  setShowForm,
  setShowPayment,
  donorInfo = {},
}) {
  const [includeTransactionFee, setIncludeTransactionFee] = useState(true);
  const transactionFee = 2;

  const totalAmount =
    donationType === "money"
      ? includeTransactionFee
        ? Number(donationAmount) + transactionFee
        : Number(donationAmount)
      : 0;

  const donationIcon =
    donationType === "money" ? (
      <FaMoneyBillWave className="text-green-500 text-3xl" />
    ) : donationType === "clothes" ? (
      <FaTshirt className="text-blue-500 text-3xl" />
    ) : (
      <FaUtensils className="text-yellow-500 text-3xl" />
    );

  return (
   <section className={`${poppins.className} container mx-auto px-4 sm:px-6 py-8 flex justify-center`}>
  <motion.div
    className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-200 w-full max-w-lg space-y-6"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
  >
    {/* Header */}
    <div className="flex items-center gap-3 border-b pb-3">
      {donationIcon}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Review Your Donation</h2>
    </div>

    {/* Summary */}
    <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-300 space-y-4 text-sm sm:text-base text-gray-700">
      <div className="flex justify-between font-medium">
        <span>Donation Type:</span>
        <span className="capitalize font-semibold text-gray-900">{donationType}</span>
      </div>

      {donationType === "money" && (
        <>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="text-green-600 font-semibold">Rs {donationAmount}</span>
          </div>
          <div className="flex justify-between">
            <span>Transaction Fee:</span>
            <span className="text-red-500">Rs {transactionFee}</span>
          </div>
          <div className="flex justify-between bg-white border border-green-200 rounded-lg px-4 py-2 font-bold text-green-700">
            <span>Total Donation:</span>
            <span>Rs {totalAmount}</span>
          </div>
        </>
      )}

      {donationType === "clothes" && (
        <>
          <p><strong>Description:</strong> {donorInfo.clothesDesc || "N/A"}</p>
          <p><strong>Quantity:</strong> {donorInfo.clothesQty || "N/A"} pieces</p>
          <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">Clothing Donation</span>
        </>
      )}

      {donationType === "food" && (
        <>
          <p><strong>Food Type:</strong> {donorInfo.foodType || "N/A"}</p>
          <p><strong>Quantity:</strong> {donorInfo.foodQty || "N/A"}</p>
          <p><strong>Expiry:</strong> {donorInfo.foodExpiry || "N/A"}</p>
          <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold">Food Donation</span>
        </>
      )}
    </div>

    {/* Buttons */}
    <div className="flex flex-col gap-3">
      {donationType === "money" ? (
        <button
          onClick={() => {
            setShowReview(false);
            setShowPayment(true);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition"
        >
          Proceed to Payment
        </button>
      ) : (
        <button
          onClick={() => alert("✅ Thank you! Your donation request has been recorded.")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
        >
          Confirm Donation
        </button>
      )}

      <button
        onClick={() => {
          setShowReview(false);
          setShowForm(true);
        }}
        className="flex items-center justify-center gap-2 w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-100 transition"
      >
        <FaArrowLeft /> Back to Donor Details
      </button>
    </div>
  </motion.div>
</section>

  );
}
