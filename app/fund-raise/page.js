"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const FundRaiserForm = ({ fundraiserId = null, onSave }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    customTitle: "",
    description: "",
    totalAmount: 0,
    filledhr: "0%",
    orphanageName: "",
  });

  useEffect(() => {
    if (fundraiserId) {
      const fetchFundraiser = async () => {
        const docRef = doc(firestore, "fundraisers", fundraiserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData((prev) => ({
            ...prev,
            ...docSnap.data(),
          }));
        }
      };
      fetchFundraiser();
    }
  }, [fundraiserId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = auth.currentUser?.uid;
    if (!userId) return alert("Login required.");

    const userSnap = await getDoc(doc(firestore, "users", userId));
    if (!userSnap.exists()) return alert("User not found.");

    const user = userSnap.data();

    try {
      if (fundraiserId) {
        // Donor flow
        if (user.userType !== "Donor") return alert("Only donors can donate.");

        await addDoc(
          collection(firestore, "fundraisers", fundraiserId, "donations"),
          {
            donorId: userId,
            amount: Number(formData.totalAmount),
            status: "pending",
            timestamp: serverTimestamp(),
          }
        );

        alert(
          "✅ Donation submitted successfully!\n\nYour contribution is pending approval by the orphanage."
        );
      } else {
        // Orphanage fundraiser creation
        if (user.userType !== "Orphanage")
          return alert("Only orphanages can create fundraisers.");

        // Use customTitle if "Other" selected, else selected title
        const finalTitle =
          formData.title === "Other"
            ? formData.customTitle.trim()
            : formData.title;

        if (!finalTitle) return alert("Please enter a valid title.");

        const fundraiserRef = await addDoc(collection(firestore, "fundraisers"), {
          ...formData,
          title: finalTitle,
          orphanageId: userId,
          orphanageName: user.name || "",
          image: "/raise.jpg", // universal image
          raisedAmount: 0,
        });

        console.log("✅ Fundraiser created:", fundraiserRef.id);
        router.push("/orphanageDashboard");
      }

      onSave?.(formData);
      setFormData({
        title: "",
        customTitle: "",
        description: "",
        totalAmount: 0,
        filledhr: "0%",
        orphanageName: "",
      });
    } catch (err) {
      console.error("❌ Error:", err);
    }
  };

  const titleOptions = [
    "Books",
    "School Uniforms",
    "Nutrition",
    "Medical Aid",
    "Other",
  ];

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-xl shadow-lg w-full max-w-md space-y-6"
      >
        <h2 className="text-3xl font-extrabold text-center text-gray-900">
          {fundraiserId ? "Donate to Fundraiser" : "Create Fundraiser"}
        </h2>

        {!fundraiserId && (
          <>
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Title
              </label>
              <select
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full border border-gray-300 px-4 py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select a title</option>
                {titleOptions.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            {formData.title === "Other" && (
              <div>
                <label
                  htmlFor="customTitle"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Custom Title
                </label>
                <input
                  type="text"
                  id="customTitle"
                  name="customTitle"
                  value={formData.customTitle}
                  onChange={handleChange}
                  placeholder="Enter your custom fundraiser title"
                  className="w-full border border-gray-300 px-4 py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the fundraiser"
                className="w-full border border-gray-300 px-4 py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="totalAmount"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {fundraiserId ? "Donation Amount" : "Total Fund Goal"}
          </label>
          <input
            type="number"
            id="totalAmount"
            name="totalAmount"
            value={formData.totalAmount}
            onChange={handleChange}
            min="1"
            placeholder={fundraiserId ? "Enter donation amount" : "Enter fund goal"}
            className="w-full border border-gray-300 px-4 py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white font-semibold py-3 rounded-md hover:bg-green-700 transition"
        >
          {fundraiserId ? "Donate Now" : "Save Fundraiser"}
        </button>
      </form>
    </div>
  );
};

export default FundRaiserForm;
