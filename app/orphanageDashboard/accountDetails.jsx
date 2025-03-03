"use client";
import { useState } from "react";
import { Poppins } from "next/font/google";
import { motion } from "framer-motion";

// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function AccountDetails() {
  const [formData, setFormData] = useState({
    firstName: "Care",
    lastName: "Connect",
    displayName: "hunnybunny112200",
    email: "hunnybunny112200@gmail.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section className={`${poppins.className} container mx-auto px-6 py-8 flex`}>
      {/* Sidebar Menu */}
      

      {/* Main Content */}
      <motion.div
        className="w-3/4 bg-white shadow-md rounded-lg p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Page Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Account Details</h2>

        {/* Account Form */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-700 font-medium">First name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-gray-700 font-medium">Last name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Display name *</label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            readOnly
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none bg-gray-100 cursor-not-allowed"
          />
          <p className="text-sm text-gray-500 mt-1">This will be how your name is displayed.</p>
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Email address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            readOnly
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* Password Change Section */}
        <h3 className="text-lg font-bold text-gray-800 mt-6 border-b pb-2">Password Change</h3>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Current password</label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">New password</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="mt-4">
          <label className="text-gray-700 font-medium">Confirm new password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Save Changes Button */}
        <button
          className="mt-6 w-full bg-green-600 text-white py-3 px-6 font-semibold hover:bg-green-700 transition-all shadow-md"
        >
          SAVE CHANGES
        </button>
      </motion.div>
    </section>
  );
}
