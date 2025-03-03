"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const Request = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false); // Flag for edit modal visibility
  const [editRequest, setEditRequest] = useState(null); // Store the request being edited
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view requests.");
        return;
      }

      try {
        const q = query(
          collection(firestore, "requests"),
          where("orphanageId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const requestList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRequests(requestList);
      } catch (err) {
        setError("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleEditClick = (request) => {
    setEditRequest(request); // Set the request to be edited
    setIsEditing(true); // Show the edit modal
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const { title, description, status } = editRequest;

    try {
      const requestRef = doc(firestore, "requests", editRequest.id);
      await updateDoc(requestRef, {
        title,
        description,
        status,
      });

      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === editRequest.id
            ? { ...req, title, description, status }
            : req
        )
      );

      setIsEditing(false); // Close the modal after saving
    } catch (err) {
      setError("Failed to update request: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this request?"))
      return;

    try {
      await deleteDoc(doc(firestore, "requests", id));
      setRequests((prev) => prev.filter((request) => request.id !== id));
    } catch (err) {
      alert("Failed to delete request: " + err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-black font-bold">Requests</h1>

          {/* Add a Request Button */}
          <button
            type="button"
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md mt-12"
            onClick={() => router.push("/add-request")}
          >
            + Add a Request
          </button>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}

        {/* Loading State */}
        {loading && (
          <p className="text-gray-500 text-center mt-4">Loading...</p>
        )}

        {/* Requests List */}
        <div className="mt-6">
          {requests.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">
              No requests yet.
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-100 p-4 rounded-lg shadow-md"
                >
                  <h2 className="text-lg font-bold">{request.title}</h2>
                  <p className="text-gray-700">{request.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Request ID:</strong> {request.id}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-md ${
                        request.status === "Pending"
                          ? "bg-yellow-400"
                          : "bg-green-500"
                      } text-white`}
                    >
                      {request.status}
                    </span>
                  </p>

                  {/* Edit & Delete Buttons */}
                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() => handleEditClick(request)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal for Editing Request */}
        {isEditing && (
          <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50">
            <div className="bg-white p-8 rounded-lg shadow-lg w-[400px]">
              <h2 className="text-2xl font-bold mb-4">Edit Request</h2>

              {/* Edit Form */}
              <form onSubmit={handleSaveChanges}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editRequest.title}
                    onChange={(e) =>
                      setEditRequest({ ...editRequest, title: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    Description
                  </label>
                  <textarea
                    value={editRequest.description}
                    onChange={(e) =>
                      setEditRequest({
                        ...editRequest,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">
                    Status
                  </label>
                  <select
                    value={editRequest.status}
                    onChange={(e) =>
                      setEditRequest({ ...editRequest, status: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Fulfilled">Fulfilled</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Request;
