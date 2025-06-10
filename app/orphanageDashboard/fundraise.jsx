"use client";

import React, { useState, useEffect } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  where,
  addDoc,
  getDoc,
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast"; // ✅ Toast

const MAX_DONATION_AMOUNT = 1000000;

const FundRaise = () => {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editFundraiser, setEditFundraiser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFundraiser, setNewFundraiser] = useState({
    title: "",
    customTitle: "",
    description: "",
    totalAmount: "",
    filledhr: "0%",
    orphanageName: "",
  });

  useEffect(() => {
    const fetchFundraisers = async () => {
      setLoading(true);
      setError("");
      try {
        const userUid = auth.currentUser?.uid;
        const q = query(
          collection(firestore, "fundraisers"),
          where("orphanageId", "==", userUid)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setError("No fundraisers found.");
          return;
        }
        const fundraiserList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFundraisers(fundraiserList);
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFundraisers();
  }, []);

  const handleDelete = async (id) => {
    const userUid = auth.currentUser?.uid;
    const fundraiser = fundraisers.find((f) => f.id === id);
    if (!fundraiser) return;
    if (window.confirm("Are you sure you want to delete this fundraiser?")) {
      try {
        if (fundraiser?.orphanageId !== userUid)
          return alert("Unauthorized");
        await deleteDoc(doc(firestore, "fundraisers", id));
        setFundraisers((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        alert("Failed to delete fundraiser: " + err.message);
      }
    }
  };

  const handleEditClick = (fundraiser) => {
    setEditFundraiser(fundraiser);
    setIsEditing(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const { title, description, totalAmount } = editFundraiser;
    const numAmount = Number(totalAmount);
    if (!title || !description) return setError("All fields required.");
    if (
      !numAmount ||
      isNaN(numAmount) ||
      numAmount < 1 ||
      numAmount > MAX_DONATION_AMOUNT
    ) {
      return setError("Total amount must be between ₹1 and ₹1,000,000.");
    }

    try {
      const ref = doc(firestore, "fundraisers", editFundraiser.id);
      const updatedStatus =
        editFundraiser.raisedAmount >= numAmount
          ? "Fulfilled"
          : editFundraiser.status;

      await updateDoc(ref, {
        title,
        description,
        totalAmount: numAmount,
        status: updatedStatus,
      });
      setFundraisers((prev) =>
        prev.map((f) =>
          f.id === editFundraiser.id
            ? {
                ...f,
                title,
                description,
                totalAmount: numAmount,
                status: updatedStatus,
              }
            : f
        )
      );
      setIsEditing(false);
      setError("");
    } catch (err) {
      setError("Update failed: " + err.message);
    }
  };

  const closeModal = () => {
    setIsEditing(false);
    setError("");
  };

  const handleAddFundraiser = async (e) => {
    e.preventDefault();
    const userId = auth.currentUser?.uid;
    if (!userId) return setError("You must be logged in.");

    try {
      const userSnap = await getDoc(doc(firestore, "users", userId));
      if (!userSnap.exists()) return setError("User not found.");
      const user = userSnap.data();
      if (user.userType !== "Orphanage")
        return setError("Only orphanages can create fundraisers.");

      const finalTitle =
        newFundraiser.title === "Other"
          ? newFundraiser.customTitle.trim()
          : newFundraiser.title;
      const totalAmount = Number(newFundraiser.totalAmount);

      if (!finalTitle) return setError("Please enter a valid title.");
      if (
        !totalAmount ||
        isNaN(totalAmount) ||
        totalAmount < 1 ||
        totalAmount > MAX_DONATION_AMOUNT
      ) {
        toast.error("Total amount must be between ₹1 and ₹1,000,000."); // ✅ Toast added
        return;
      }

      const docRef = await addDoc(collection(firestore, "fundraisers"), {
        ...newFundraiser,
        title: finalTitle,
        totalAmount,
        orphanageId: userId,
        orphanageName: user.name || "",
        image: "/raise.jpg",
        raisedAmount: 0,
      });

      setFundraisers([
        ...fundraisers,
        {
          ...newFundraiser,
          id: docRef.id,
          orphanageId: userId,
          orphanageName: user.name || "",
          image: "/raise.jpg",
          raisedAmount: 0,
        },
      ]);
      setShowAddModal(false);
      setNewFundraiser({
        title: "",
        customTitle: "",
        description: "",
        totalAmount: "",
        filledhr: "0%",
        orphanageName: "",
      });
    } catch (err) {
      setError("Failed to add: " + err.message);
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
    <div className="bg-gray-50 w-full min-h-screen p-6">
      <Toaster position="top-right" /> {/* ✅ Toast mount */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-bold text-gray-800">FundRaise</h2>
        <button
          type="button"
          className="bg-green-600 text-white font-medium py-2 px-4 rounded-md"
          onClick={() => setShowAddModal(true)}
        >
          + Add a FundRaise
        </button>
      </div>

      {error && (
        <div className="bg-red-500 text-white text-center py-2 mb-6 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {fundraisers.length === 0 ? (
            <p className="text-center text-xl text-gray-500">
              No fundraisers found.
            </p>
          ) : (
            fundraisers.map((fundraiser) => (
              <div
                key={fundraiser.id}
                className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto"
              >
                <h2 className="text-xl font-semibold mb-1">
                  {fundraiser.title}
                </h2>
                <p className="text-gray-700 mb-2">{fundraiser.description}</p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>ID:</strong> {fundraiser.id}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Raised:</strong> Rs. {fundraiser.raisedAmount || 0} / Rs.{" "}
                  {fundraiser.totalAmount}
                </p>
                <p className="text-sm font-semibold">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-white ${
                      fundraiser.status === "Pending"
                        ? "bg-yellow-500"
                        : "bg-green-600"
                    }`}
                  >
                    {fundraiser.status}
                  </span>
                </p>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={() => handleEditClick(fundraiser)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(fundraiser.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <form
            onSubmit={handleAddFundraiser}
            className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full space-y-4"
          >
            <h2 className="text-2xl font-bold text-center text-gray-900">
              Create Fundraiser
            </h2>
            <select
              name="title"
              value={newFundraiser.title}
              onChange={(e) =>
                setNewFundraiser({
                  ...newFundraiser,
                  title: e.target.value,
                })
              }
              className="w-full border border-gray-300 px-4 py-3 rounded-md"
              required
            >
              <option value="">Select a title</option>
              {titleOptions.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            {newFundraiser.title === "Other" && (
              <input
                type="text"
                name="customTitle"
                placeholder="Custom Title"
                value={newFundraiser.customTitle}
                onChange={(e) =>
                  setNewFundraiser({
                    ...newFundraiser,
                    customTitle: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
            )}
            <textarea
              name="description"
              placeholder="Description"
              value={newFundraiser.description}
              onChange={(e) =>
                setNewFundraiser({
                  ...newFundraiser,
                  description: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-md p-2"
              required
              rows={3}
            />
            <input
              type="number"
              name="totalAmount"
              placeholder="Total Amount"
              value={newFundraiser.totalAmount}
              onChange={(e) =>
                setNewFundraiser({
                  ...newFundraiser,
                  totalAmount: Number(e.target.value),
                })
              }
              className="w-full border border-gray-300 rounded-md p-2"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-3xl text-gray-600 hover:text-gray-800"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Edit Fundraiser
            </h2>
            {error && (
              <div className="bg-red-500 text-white text-center py-2 mb-4 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSaveChanges} className="space-y-5">
              <input
                type="text"
                value={editFundraiser.title}
                onChange={(e) =>
                  setEditFundraiser({
                    ...editFundraiser,
                    title: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
              />
              <textarea
                value={editFundraiser.description}
                onChange={(e) =>
                  setEditFundraiser({
                    ...editFundraiser,
                    description: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                required
                rows={3}
              />
              <input
                type="number"
                value={editFundraiser.raisedAmount}
                readOnly
                className="w-full border border-gray-300 bg-gray-100 rounded-md p-2"
              />
              <input
                type="number"
                value={editFundraiser.totalAmount}
                onChange={(e) =>
                  setEditFundraiser({
                    ...editFundraiser,
                    totalAmount: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-md p-2"
                min={0}
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundRaise;
