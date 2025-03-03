"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import { Space } from "lucide-react";
import Footer from "../footer/page";
export default function DonationStart({ setShowForm }) {
  const [amount, setAmount] = useState("");

  return (
    <motion.div
      className="flex flex-col lg:flex-row items-center gap-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Left Section - Donation Image */}
      <motion.div
        className="overflow-hidden shadow-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Image
          src="/donateto.jpg" // Ensure image is in the public directory
          alt="Donation"
          width={550}
          height={400}
          className="object-cover"
        />
      </motion.div>
      {/* Right Section - Donation Details */}
      <div className="lg:w-2/3">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Donation</h2>
        <p className="text-gray-600 text-sm">
          Please enter donation amount in digits. Donation amount cannot be
          negative.
        </p>
        {/* Back to Main Page Button */}
        <button
          onClick={() => (window.location.href = "./")} // Adjust route if needed
          className="mt-4 w-2/7 px-2 py-2 text-slate-700  bg-gray-100 font-bold text-sm hover:bg-gray-200 transition"
        >
          BACK TO MAIN PAGE
        </button>
        {/* Donation Input Field */}
        <div className="mt-6">
          <label className="text-gray-700 font-medium text-thin">
            Enter Donation Amount{" "}
            <strong className="text-black mr-2">Rs.</strong>
          </label>
          <input
            type="number"
            className="w-1/2 border border-gray-300  px-1 mt-2  focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {/* Proceed to Donor Details Button */}
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 w-full bg-green-600 text-white py-2 px-6 font-semibold hover:bg-green-700 transition-all shadow-md  md:w-3/5"
        >
          PROCEED TO DONOR DETAILS
        </button>
      </div>
    </motion.div>
  );
}
