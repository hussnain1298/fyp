"use client";
import { useState } from "react"; // ✅ Required
import { motion } from "framer-motion";
import Image from "next/image";

export default function DonationStart({ setShowForm, setShowReview, setDonationAmount, setDonationType }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");

  const handleProceed = () => {
    if (!type) return alert("Please select a donation type.");
    if (type === "money" && (!amount || amount <= 0)) return alert("Please enter a valid amount.");

    setDonationType(type);
    if (type === "money") setDonationAmount(amount);

    setShowForm(true); // Always go to donor form next
  };

  return (

   <motion.div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 space-y-6 border border-gray-200">
  <h2 className="text-3xl font-bold text-gray-800 text-center">Start Your Donation</h2>

  <div className="space-y-4">
    <div>
      <label htmlFor="donationType" className="block font-semibold text-gray-700 mb-1">Select Donation Type</label>
      <select
        id="donationType"
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:ring-2 focus:ring-green-500"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="">-- Choose Type --</option>
        <option value="money">💸 Money</option>
        <option value="clothes">👕 Clothes</option>
        <option value="food">🍱 Food</option>
      </select>
      <p className="text-sm text-gray-500 mt-1">Your donation can change lives!</p>
    </div>

    {type === "money" && (
      <div>
        <label htmlFor="donationAmount" className="block font-semibold text-gray-700 mb-1">Donation Amount (PKR)</label>
        <input
          id="donationAmount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500"
          placeholder="e.g. 1000"
        />
      </div>
    )}
  </div>

  <button
    onClick={handleProceed}
    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
  >
    Proceed to Donor Details
  </button>
</motion.div>


  );
}
