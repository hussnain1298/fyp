"use client";
import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AddressSection() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);  // Loading state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    const fetchUserAddress = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              name: data.orgName || "CareConnect", // Default value if not available
              address: data.orgAddress || "NTU", // Default value
              city: data.city || "Faisalabad", // Default value
              state: data.state || "Punjab", // Default value
              zip: data.zip || "38000", // Default value
            });
          } else {
            toast.error("User data not found!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to load user address data.");
        }
      }
    };

    fetchUserAddress();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (isLoading) return; // Prevent multiple saves
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(firestore, "users", user.uid);
        // Update the address data in Firestore
        await updateDoc(userRef, {
          orgName: formData.name,
          orgAddress: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        });

        toast.success("Address saved successfully!");
      } else {
        toast.error("User is not authenticated.");
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address.");
    } finally {
      setIsLoading(false);
      setIsEditing(false);  // Exit edit mode after saving
    }
  };

  return (
    <motion.div
      className="w-full p-6 bg-white shadow-md rounded-lg mt-10"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ToastContainer />
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
            disabled={isLoading}
            className={`mt-3 px-4 py-2 ${isLoading ? 'bg-gray-400' : 'bg-green-500'} text-white rounded-md hover:bg-green-600 transition`}
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
