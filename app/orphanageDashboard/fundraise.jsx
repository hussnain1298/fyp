"use client";
import { auth, firestore } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const FundRaiserForm = ({ onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    raisedAmount: 0,
    totalAmount: 0,
    filledhr: "50%",
  });

  const router = useRouter();

  useEffect(() => {
    if (formData.totalAmount > 0) {
      const filledPercentage = (formData.raisedAmount / formData.totalAmount) * 100;
      const cappedFilledPercentage = Math.min(filledPercentage, 100);
      setFormData((prevData) => ({
        ...prevData,
        filledhr: `${cappedFilledPercentage}%`,
      }));
    }
  }, [formData.raisedAmount, formData.totalAmount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const imageMap = {
      "Books": "/books.jpg",
      "School Uniforms": "/uniforms.jpg",
      "Nutrition": "/nutrition.jpg",
      "Medical Aid": "/aid.webp",
    };

    const imageUrl = imageMap[formData.title] || "";

    try {
      const docRef = await addDoc(collection(firestore, "fundraisers"), {
        ...formData,
        image: imageUrl,
        orphanageId: auth.currentUser?.uid || "",
      });

      if (onSave && typeof onSave === "function") {
        onSave(formData);
      }

      setFormData({
        title: "",
        description: "",
        raisedAmount: 0,
        totalAmount: 0,
        filledhr: "50%",
      });

      console.log("Fundraiser Document written with ID: ", docRef.id);
      router.push("/orphanageDashboard");
    } catch (err) {
      console.error("Error adding document: ", err);
    }
  };

  const titleOptions = ["Books", "School Uniforms", "Nutrition", "Medical Aid"];

  return (
    <div className="flex justify-center items-center min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="p-6 bg-white rounded-lg shadow-lg w-[400px]"
      >
        <h2 className="text-2xl font-bold mb-4">Create Fund Raise</h2>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Title</label>
          <select
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            required
          >
            <option value="" disabled>Select a title</option>
            {titleOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
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
            readOnly
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md"
        >
          Save Fund Raise
        </button>
      </form>
    </div>
  );
};

export default FundRaiserForm;