"use client";
import { useState } from "react";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";
import { FaTimes } from "react-icons/fa"; // Importing Close (X) icon

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function ReviewDonation({
  donationAmount,
  setShowReview,
  setShowForm,
  setShowPayment,
}) {
  const [includeTransactionFee, setIncludeTransactionFee] = useState(true);
  const transactionFee = 2;
  const totalAmount = includeTransactionFee ? donationAmount + transactionFee : donationAmount;

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex justify-center`}>
      <motion.div
        className="bg-white shadow-md rounded-lg p-6 border w-full max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header */}
        <h2 className="text-xl font-bold border-b pb-2 text-gray-800">REVIEW DONATION</h2>

        {/* Table Section */}
        <div className="mt-4">
          <div className="grid grid-cols-4 text-gray-700 font-semibold pb-2 border-b">
            <span>DONATION</span>
            <span className="text-center">QTY</span>
            <span className="text-right">TOTAL</span>
            <span className="text-right">REMOVE</span>
          </div>

          {/* Donation Item */}
          <div className="grid grid-cols-4 items-center py-2 border-b">
            {/* Donation Image */}
            <div className="flex items-center">
              <Image src="/donate.jpg" alt="Donation" width={50} height={50} className="rounded-md" />
              <span className="ml-3 text-gray-700">Donation</span>
            </div>

            {/* Quantity */}
            <div className="text-center">1</div>

            {/* Total Price */}
            <div className="text-right text-green-600 font-semibold">Rs{donationAmount}</div>

            {/* Remove Icon */}
            <div className="text-right text-red-500 cursor-pointer hover:text-red-700 transition">
              <FaTimes size={16} />
            </div>
          </div>
        </div>

        {/* Subtotal */}
        <div className="flex justify-between text-gray-700 mt-4">
          <span>Subtotal</span>
          <span className="text-green-600 font-semibold">Rs{donationAmount}</span>
        </div>

        {/* Transaction Charges */}
        <div className="mt-4">
          <span className="text-gray-700 font-semibold">Transaction charges</span>
          <div className="mt-2">
            {/* Option 1: User Pays Transaction Fee */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="transactionFee"
                checked={includeTransactionFee}
                onChange={() => setIncludeTransactionFee(true)}
                className="accent-green-500"
              />
              <span className="text-gray-700">Yes, I will pay for the transaction charges</span>
              <span className="text-green-600 font-semibold">Rs{transactionFee}</span>
            </label>

            {/* Option 2: Edhi Pays Transaction Fee */}
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="radio"
                name="transactionFee"
                checked={!includeTransactionFee}
                onChange={() => setIncludeTransactionFee(false)}
                className="accent-green-500"
              />
              <span className="text-gray-700">No, Edhi will pay for the transaction</span>
            </label>
          </div>
        </div>

        {/* Total Amount */}
        <div className="flex justify-between text-gray-700 mt-4">
          <span>Total</span>
          <span className="text-green-600 font-semibold">Rs{totalAmount}</span>
        </div>

        {/* Proceed to Payment Button */}
        <button
          onClick={() => {
            setShowReview(false);
            setShowPayment(true); // Move to Proceed Payment Page
          }}
          className="mt-4 w-full bg-green-600 text-white py-3 px-6 font-semibold hover:bg-green-700 transition-all shadow-md"
        >
          PROCEED TO PAYMENT
        </button>
        {/* Back Button */}
        <button
          onClick={() => {
            setShowReview(false);
            setShowForm(true); // Go back to Donor Form
          }}
          className="mt-4 w-full px-6 py-3 border border-gray-400 rounded-lg text-gray-700 font-semibold hover:bg-gray-200 transition-all"
        >
          BACK TO DONOR DETAILS
        </button>
      </motion.div>
    </section>
  );
}
