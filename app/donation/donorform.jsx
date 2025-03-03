"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function DonorForm({ setShowForm, setShowReview }) 
{
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "Punjab",
    postcode: "",
    phone: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <motion.div
      className={`${poppins.className} max-w-md mx-auto bg-white p-6 shadow-`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
        DONOR DETAILS
      </h2>

      {/* First & Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-gray-700 font-medium">First name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Ali"
          />
        </div>
        <div>
          <label className="text-gray-700 font-medium">Last name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Hussnain"
          />
        </div>
      </div>

      {/* Address */}
      <div className="mt-4">
        <label className="text-gray-700 font-medium">Address *</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="House no 19 Faisal City"
        />
      </div>

      {/* City & State */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="text-gray-700 font-medium">Town / City *</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Faisalabad"
          />
        </div>
        <div>
          <label className="text-gray-700 font-medium">State / County *</label>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="Punjab">Punjab</option>
            <option value="Sindh">Sindh</option>
            <option value="KPK">KPK</option>
            <option value="Balochistan">Balochistan</option>
          </select>
        </div>
      </div>

      {/* Postcode & Phone */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="text-gray-700 font-medium">Postcode / ZIP *</label>
          <input
            type="text"
            name="postcode"
            value={formData.postcode}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="38000"
          />
        </div>
        <div>
          <label className="text-gray-700 font-medium">Phone *</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2  mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="+923218582020"
          />
        </div>
      </div>

      {/* Buttons */}
      <button
        onClick={() => {
          setShowReview(true);
          setShowForm(false); // Hide Donor Form when showing Review Donation
        }}
        className="mt-4 w-full bg-green-600 text-white py-3 px-6 font-semibold hover:bg-green-700 transition-all shadow-md"
      >
        Proceed to Review Donation
      </button>

      <button
        onClick={() => setShowForm(false)}
        className="mt-4 w-full px-6 py-3 border border-gray-400 rounded-lg text-gray-700 font-semibold hover:bg-gray-200 transition-all"
      >
        BACK TO DONATION
      </button>
    </motion.div>
  );
}
