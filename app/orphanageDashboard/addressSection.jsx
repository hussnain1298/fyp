"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function AddressSection() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "CareConnect",
    address: "NTU",
    city: "Faisalabad",
    state: "Punjab",
    zip: "38000",
  });

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle save action
  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <motion.div
      className="w-full p-6 bg-white shadow-md rounded-lg mt-10"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-gray-700">
        The following addresses will be used on the checkout page by default.
      </p>

      <h2 className="text-xl font-bold mt-4 border-b pb-2 flex justify-between items-center">
        BILLING ADDRESS
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-500 hover:text-blue-700 transition font-medium"
          >
            Edit
          </button>
        ) : null}
      </h2>

      {/* Display Mode */}
      {!isEditing ? (
        <div className="mt-4 text-gray-700 space-y-1">
          <p className="font-semibold">{formData.name}</p>
          <p>{formData.address}</p>
          <p>{formData.city}</p>
          <p>{formData.state}</p>
          <p className="italic">{formData.zip}</p>
        </div>
      ) : (
        // Edit Mode
        <div className="mt-4 space-y-2">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            name="zip"
            value={formData.zip}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-400"
          />

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="mt-3 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
          >
            Save
          </button>
        </div>
      )}
    </motion.div>
  );
}
