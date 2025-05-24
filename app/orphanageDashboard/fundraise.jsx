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

    // Log the fundraiser ID and the current user UID
    console.log(`User UID: ${userUid}`);
    console.log(`Fundraiser Orphanage ID: ${fundraiser?.orphanageId}`);
    console.log(`Deleting Fundraiser with ID: ${id}`);

    if (window.confirm("Are you sure you want to delete this fundraiser?")) {
      try {
        // Ensure the user is allowed to delete the fundraiser
        if (fundraiser?.orphanageId !== userUid) {
          alert("You are not authorized to delete this fundraiser.");
          return;
        }

        const docRef = doc(firestore, "fundraisers", id);
        
        // Log the deletion attempt
        console.log("Deleting document:", docRef);
        
        await deleteDoc(docRef); // Attempt to delete the fundraiser document
        console.log(`Fundraiser with ID ${id} successfully deleted`);

        // Update the state to reflect the deletion
        setFundraisers((prev) => prev.filter((fundraiser) => fundraiser.id !== id));
      } catch (err) {
        console.error("Failed to delete fundraiser: ", err);
        alert("Failed to delete fundraiser: " + err.message); // Show error message if deletion fails
      }
    }
  };

  // Handle View Chat (Assuming chat functionality will be integrated)
  const handleViewChat = (fundraiserId) => {
    // Redirect to chat page with fundraiser details
    router.push(`/chat?fundraiserId=${fundraiserId}`);
  };

  // Handle Edit Fundraiser
  const handleEditClick = (fundraiser) => {
    setEditFundraiser(fundraiser);
    setIsEditing(true); // Open the edit modal
  };

  // Save Updated Fundraiser
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const { title, description, status, raisedAmount, totalAmount } = editFundraiser;

    // Ensure all fields are filled out
    if (!title || !description || !status || raisedAmount === undefined || totalAmount === undefined) {
      setError("All fields must be filled out.");
      return;
    }

    try {
      const fundraiserRef = doc(firestore, "fundraisers", editFundraiser.id);
      await updateDoc(fundraiserRef, { title, description, status, raisedAmount, totalAmount });

      setFundraisers((prevFundraisers) =>
        prevFundraisers.map((fundraiser) =>
          fundraiser.id === editFundraiser.id
            ? { ...fundraiser, title, description, status, raisedAmount, totalAmount }
            : fundraiser
        )
      );

      setIsEditing(false); // Close the modal after saving
    } catch (err) {
      setError("Failed to update fundraiser: " + err.message);
    }
  };

  // Close the modal when clicking the X
  const closeModal = () => {
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-50 w-full h-[100%]">
      <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold text-gray-800 text-center pb-6 mt-20">
            FundRaise
          </h2>

          {/* ✅ Add a Request Button */}
          <button
            type="button"
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md mt-12"
            onClick={() => router.push("/fund-raise")}
          >
            + Add a FundRaise
          </button>
        </div>

      {/* Error Handling    {error && <div className="bg-red-500 text-white text-center py-4">{error}</div>} */}
    

      {/* Loading State */}
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="flex flex-col w-[98%] m-auto gap-8 pb-32 px-5 overflow-auto scrollbar-hide">
          {fundraisers.length === 0 ? (
            <p className="text-center text-xl text-gray-500">No fundraisers found.</p>
          ) : (
            fundraisers.map((fundraiser) => (
              <div key={fundraiser.id} className="bg-white p-4 rounded-lg w-full">
                <div className="bg-gray-100 p-4 rounded-lg shadow-md">
                  <h2 className="text-lg font-bold">{fundraiser.title}</h2>
                  <p className="text-gray-700">{fundraiser.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Fundraiser ID:</strong> {fundraiser.id}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-md ${
                        fundraiser.status === "Pending" ? "bg-yellow-400" : "bg-green-500"
                      } text-white`}
                    >
                      {fundraiser.status}
                    </span>
                  </p>

                 
                   

                 


 {/* ✅ Buttons */}
                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() => handleEditClick(fundraiser)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(fundraiser.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>








































                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Fundraiser Modal */}
      {isEditing && (
        <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-[400px] relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-xl text-gray-500 hover:text-gray-700"
            >
              &times; {/* Close Icon */}
            </button>
            <h2 className="text-2xl font-bold mb-4">Edit Fundraiser</h2>

            {/* Edit Form */}
            <form onSubmit={handleSaveChanges}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={editFundraiser.title}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={editFundraiser.description}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Status Change Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select
                  value={editFundraiser.status}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Fulfilled">Fulfilled</option>
                </select>
              </div>

              {/* Amount Fields */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Raised Amount</label>
                <input
                  type="number"
                  value={editFundraiser.raisedAmount}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, raisedAmount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Total Amount</label>
                <input
                  type="number"
                  value={editFundraiser.totalAmount}
                  onChange={(e) =>
                    setEditFundraiser({ ...editFundraiser, totalAmount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
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
