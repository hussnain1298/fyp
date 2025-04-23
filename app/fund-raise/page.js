"use client";
import React, { useState } from "react";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const FundRaiserForm = ({ onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    raisedAmount: 0,
    totalAmount: 0,
    filledhr: "50%", // A default value for the progress bar
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-lg w-[400px]">
      <h2 className="text-2xl font-bold mb-4">Create Fund Raise</h2>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Raised Amount</label>
        <input
          type="number"
          name="raisedAmount"
          value={formData.raisedAmount}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Total Amount</label>
        <input
          type="number"
          name="totalAmount"
          value={formData.totalAmount}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Progress (Filled)</label>
        <input
          type="text"
          name="filledhr"
          value={formData.filledhr}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
        Save Fund Raise
      </button>
    </form>
  );
};

export default FundRaiserForm;
