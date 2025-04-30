'use client';
import { auth, firestore } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore"; // Firestore functions
import { storage } from "@/lib/firebase"; // Firebase Storage
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage functions
import React, { useState, useEffect } from "react";

const FundRaiserForm = ({ onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    raisedAmount: 0,
    totalAmount: 0,
    filledhr: "50%", // Default value for progress
    image: null, // Image state
  });

  // Update the progress percentage when raisedAmount or totalAmount changes
  useEffect(() => {
    if (formData.totalAmount > 0) {
      const filledPercentage = (formData.raisedAmount / formData.totalAmount) * 100;
      const cappedFilledPercentage = Math.min(filledPercentage, 100); // Cap the percentage at 100
      setFormData((prevData) => ({
        ...prevData,
        filledhr: `${cappedFilledPercentage}%`, // Ensure progress doesn't exceed 100%
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prevData) => ({
        ...prevData,
        image: file,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = "";
    if (formData.image) {
      // Upload image to Firebase Storage
      const imageRef = ref(storage, `fundraisers/${formData.image.name}`);
      try {
        await uploadBytes(imageRef, formData.image);
        imageUrl = await getDownloadURL(imageRef); // Get image URL from Firebase Storage
      } catch (err) {
        console.error("Error uploading image: ", err);
        imageUrl = ""; // Fallback if image upload fails
      }
    }

    try {
      // Add form data to Firestore in a separate collection 'fundraisers'
      const docRef = await addDoc(collection(firestore, "fundraisers"), {
        ...formData,
        image: imageUrl || "", // Store the image URL or empty string if upload failed
        orphanageId: auth.currentUser.uid, // Add the orphanage's ID to associate the request
      });

      // Pass the saved data to the parent component, if needed
      if (onSave && typeof onSave === "function") {
        onSave(formData); // Call only if onSave is a valid function
      }

      // Reset the form after saving
      setFormData({
        title: "",
        description: "",
        raisedAmount: 0,
        totalAmount: 0,
        filledhr: "50%",
        image: null, // Reset the image
      });

      console.log("Fundraiser Document written with ID: ", docRef.id);
    } catch (err) {
      console.error("Error adding document: ", err);
    }
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

      {/* Image Upload */}
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Upload Image</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
        Save Fund Raise
      </button>
    </form>
  );
};

export default FundRaiserForm;
