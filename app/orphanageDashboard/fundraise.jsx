'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { firestore } from "@/lib/firebase";
import { collection, query, getDocs, deleteDoc, doc, updateDoc, where } from "firebase/firestore";
import { auth } from "@/lib/firebase";

const FundRaise = () => {
  const [fundraisers, setFundraisers] = useState([]); // State to store fundraisers data
  const [loading, setLoading] = useState(true); // State to handle loading state
  const [error, setError] = useState(""); // State to handle error messages
  const [isEditing, setIsEditing] = useState(false); // State to control the visibility of the edit modal
  const [editFundraiser, setEditFundraiser] = useState(null); // Store the fundraiser being edited
  const router = useRouter(); // Initialize router for navigation

  // Fetch fundraisers data from Firestore
  useEffect(() => {
    const fetchFundraisers = async () => {
      setLoading(true);
      setError("");

      try {
        const userUid = auth.currentUser?.uid; // Get the logged-in user's UID (orphanage ID)

        // Query to filter fundraisers based on the orphanageId
        const q = query(collection(firestore, "fundraisers"), where("orphanageId", "==", userUid));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("No fundraisers found.");
          return;
        }

        const fundraiserList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFundraisers(fundraiserList); // Update state with fetched fundraisers
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFundraisers();
  }, []); // Fetch data once when the component mounts

  // Delete Fundraiser
  const handleDelete = async (id) => {
    const userUid = auth.currentUser?.uid;
    const fundraiser = fundraisers.find(f => f.id === id);

    if (!fundraiser) {
      console.error("Fundraiser not found.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this fundraiser?")) {
      try {
        // Ensure the user is allowed to delete the fundraiser
        if (fundraiser?.orphanageId !== userUid) {
          alert("You are not authorized to delete this fundraiser.");
          return;
        }

        const docRef = doc(firestore, "fundraisers", id);
        await deleteDoc(docRef); // Attempt to delete the fundraiser document

        // Update the state to reflect the deletion
        setFundraisers((prev) => prev.filter((fundraiser) => fundraiser.id !== id));
      } catch (err) {
        console.error("Failed to delete fundraiser: ", err);
        alert("Failed to delete fundraiser: " + err.message); // Show error message if deletion fails
      }
    }
  };

  // Handle Edit Fundraiser
  const handleEditClick = (fundraiser) => {
    setEditFundraiser(fundraiser);
    setIsEditing(true); // Open the edit modal
  };

  // Save Updated Fundraiser
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const { title, description, totalAmount } = editFundraiser;

    // Ensure required fields are filled out
    if (!title || !description || totalAmount === undefined) {
      setError("All fields must be filled out.");
      return;
    }

    try {
      const fundraiserRef = doc(firestore, "fundraisers", editFundraiser.id);

      // Automatically update status to 'Fulfilled' if goal reached
      let updatedStatus = editFundraiser.status;
      if (editFundraiser.raisedAmount >= totalAmount) {
        updatedStatus = "Fulfilled";
      }

      await updateDoc(fundraiserRef, {
        title,
        description,
        totalAmount,
        status: updatedStatus,
      });

      setFundraisers((prevFundraisers) =>
        prevFundraisers.map((fundraiser) =>
          fundraiser.id === editFundraiser.id
            ? { ...fundraiser, title, description, totalAmount, status: updatedStatus }
            : fundraiser
        )
      );

      setIsEditing(false); // Close the modal after saving
      setError("");
    } catch (err) {
      setError("Failed to update fundraiser: " + err.message);
    }
  };

  // Close the modal when clicking the X
  const closeModal = () => {
    setIsEditing(false);
    setError("");
  };

  return (
    <div className="bg-gray-50 w-full min-h-screen p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-bold text-gray-800">FundRaise</h2>
        <button
          type="button"
          className="bg-green-600 text-white font-medium py-2 px-4 rounded-md"
          onClick={() => router.push("/fund-raise")}
        >
          + Add a FundRaise
        </button>
      </div>

      {error && (
        <div className="bg-red-500 text-white text-center py-2 mb-6 rounded">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {fundraisers.length === 0 ? (
            <p className="text-center text-xl text-gray-500">No fundraisers found.</p>
          ) : (
            fundraisers.map((fundraiser) => (
              <div key={fundraiser.id} className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-1">{fundraiser.title}</h2>
                <p className="text-gray-700 mb-2">{fundraiser.description}</p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Fundraiser ID:</strong> {fundraiser.id}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Raised:</strong> Rs. {fundraiser.raisedAmount || 0} &nbsp;|&nbsp; <strong>Total:</strong> Rs. {fundraiser.totalAmount}
                </p>
                <p className="text-sm font-semibold">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-white ${
                      fundraiser.status === "Pending" ? "bg-yellow-500" : "bg-green-600"
                    }`}
                  >
                    {fundraiser.status}
                  </span>
                </p>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={() => handleEditClick(fundraiser)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(fundraiser.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500 transition"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Fundraiser Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-3xl text-gray-600 hover:text-gray-800 transition"
              aria-label="Close modal"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Edit Fundraiser</h2>
            {error && (
              <div className="bg-red-500 text-white text-center py-2 mb-4 rounded">{error}</div>
            )}
            <form onSubmit={handleSaveChanges} className="space-y-5">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Title</label>
                <input
                  type="text"
                  value={editFundraiser.title}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Description</label>
                <textarea
                  value={editFundraiser.description}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  rows={3}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Raised Amount</label>
                <input
                  type="number"
                  value={editFundraiser.raisedAmount}
                  readOnly
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Total Amount</label>
                <input
                  type="number"
                  value={editFundraiser.totalAmount}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, totalAmount: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  min={0}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
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
