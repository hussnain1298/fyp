"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const MAX_DONATION_AMOUNT = 1000000;

const FundRaiserForm = ({ fundraiserId = null, onSave }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    customTitle: "",
    description: "",
    totalAmount: "",
    filledhr: "0%",
    orphanageName: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    if (error) setError("");

    // Sanitize totalAmount input to allow only numbers and limit max value
    if (name === "totalAmount") {
      if (value === "") {
        setFormData((prev) => ({ ...prev, [name]: "" }));
        return;
      }

      const numericValue = Number(value);
      if (isNaN(numericValue) || numericValue < 0) return; // Ignore invalid input
      if (numericValue > MAX_DONATION_AMOUNT) {
        setError(`Amount must be less than ${MAX_DONATION_AMOUNT.toLocaleString()}`);
        e.target.focus();
        return;
      }
      setError("");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError("You must be logged in.");
      setSubmitting(false);
      document.getElementById("totalAmount")?.focus();
      return;
    }

    try {
      const userSnap = await getDoc(doc(firestore, "users", userId));
      if (!userSnap.exists()) {
        setError("User not found.");
        setSubmitting(false);
        return;
      }

      const user = userSnap.data();

      if (fundraiserId) {
        if (user.userType !== "Donor") {
          setError("Only donors can donate.");
          setSubmitting(false);
          return;
        }

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

        setFormData((prev) => ({
          ...prev,
          totalAmount: "",
        }));
      } else {
        if (user.userType !== "Orphanage") {
          setError("Only orphanages can create fundraisers.");
          setSubmitting(false);
          return;
        }

        const finalTitle =
          formData.title === "Other"
            ? formData.customTitle.trim()
            : formData.title;

        if (!finalTitle) {
          setError("Please enter a valid title.");
          setSubmitting(false);
          document.getElementById("title")?.focus();
          return;
        }

        await addDoc(collection(firestore, "fundraisers"), {
          ...formData,
          title: finalTitle,
          orphanageId: userId,
          orphanageName: user.name || "",
          image: "/raise.jpg",
          raisedAmount: 0,
        });

        router.push("/orphanageDashboard");
      }

      onSave?.(formData);
    } catch (err) {
      setError("An error occurred: " + err.message);
    } finally {
      setSubmitting(false);
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

        {error && (
          <p className="text-red-600 text-center font-semibold">{error}</p>
        )}

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
            max={MAX_DONATION_AMOUNT}
            placeholder={fundraiserId ? "Enter donation amount" : "Enter fund goal"}
            className="w-full border border-gray-300 px-4 py-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-md font-semibold text-white ${
            submitting ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          } transition`}
        >
          {submitting
            ? fundraiserId
              ? "Processing Donation..."
              : "Saving Fundraiser..."
            : fundraiserId
            ? "Donate Now"
            : "Save Fundraiser"}
        </button>
      </form>
    </div>
  );
};

export default FundRaiserForm;
