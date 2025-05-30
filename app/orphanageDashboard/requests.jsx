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
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const Request = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("");
  const [quantity, setQuantity] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(firestore, "requests"),
          where("orphanageId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const list = await Promise.all(
          querySnapshot.docs.map(async (docRef) => {
            const data = docRef.data();
            const donationQuery = query(
              collection(firestore, "donations"),
              where("requestId", "==", docRef.id),
              where("orphanageId", "==", user.uid)
            );
            const donationSnapshot = await getDocs(donationQuery);

            let totalDonated = 0;
            donationSnapshot.forEach((d) => {
              totalDonated += parseInt(d.data().numClothes) || 0;
            });

            return {
              id: docRef.id,
              ...data,
              totalDonated,
            };
          })
        );

        setRequests(list);
      } catch (err) {
        setError("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAddRequest = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const type = requestType === "Other" ? quantity.trim() : requestType;

      const requestData = {
        requestType: type,
        description: description.trim(),
        orphanageId: user.uid,
        orphanageEmail: user.email,
        status: "Pending",
        timestamp: serverTimestamp(),
      };

      if (["Clothes", "Money"].includes(requestType)) {
        requestData.quantity = Number(quantity);
      }

      await addDoc(collection(firestore, "requests"), requestData);
      setIsModalOpen(false);
      setDescription(""); setRequestType(""); setQuantity("");
      location.reload();
    } catch (err) {
      setError("Add failed: " + err.message);
    }
  };

  const handleEditClick = (req) => {
    setEditRequest(req);
    setIsEditing(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      const ref = doc(firestore, "requests", editRequest.id);
      await updateDoc(ref, {
        requestType: editRequest.requestType,
        description: editRequest.description,
        status: editRequest.status,
      });

      setRequests((prev) =>
        prev.map((r) => (r.id === editRequest.id ? editRequest : r))
      );
      setIsEditing(false);
    } catch (err) {
      setError("Update failed: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirm delete?")) return;
    try {
      await deleteDoc(doc(firestore, "requests", id));
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError("Delete failed: " + err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <div className="flex justify-between">
          <h2 className="text-4xl font-bold">Requests</h2>
          <button
            className="bg-green-600 text-white py-2 px-4 rounded"
            onClick={() => setIsModalOpen(true)}
          >
            + Add a Request
          </button>
        </div>

        {error && <p className="text-red-500 mt-4">{error}</p>}
        {loading && <p className="text-gray-500 mt-4">Loading...</p>}

        <div className="mt-6 space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-gray-100 p-4 rounded shadow">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">{r.requestType}</h2>
                <span className={`inline-block px-2 py-1 rounded text-white text-xs ${
                  r.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                }`}>
                  {r.status}
                </span>
              </div>
              <p>{r.description}</p>
              {r.quantity && (
                <p className="text-sm mt-1">
                  {r.requestType === "Clothes"
                    ? `Clothes Needed: ${r.quantity}`
                    : `Money Needed: $${r.quantity}`}
                </p>
              )}
              {r.totalDonated > 0 && (
                <p className="text-sm text-green-700 mt-1">
                  Total Donated: {r.totalDonated}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => handleEditClick(r)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded"
                  onClick={() => handleDelete(r.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Request Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-[400px]">
              <h2 className="text-2xl font-bold mb-4">New Request</h2>
              <form onSubmit={handleAddRequest} className="space-y-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="requestType">Type</Label>
                  <select
                    id="requestType"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    required
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select Type</option>
                    <option value="Food">Food</option>
                    <option value="Clothes">Clothes</option>
                    <option value="Money">Money</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {requestType === "Other" && (
                  <div>
                    <Label htmlFor="customType">Custom Type</Label>
                    <Input
                      id="customType"
                      placeholder="Enter custom request type"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                )}

                {["Clothes", "Money"].includes(requestType) && (
                  <div>
                    <Label htmlFor="quantity">
                      {requestType === "Clothes" ? "Clothes Needed" : "Money Amount"}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="flex justify-between">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-black">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded w-[400px] shadow-xl">
              <h2 className="text-xl font-bold mb-4">Edit Request</h2>
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <input
                  value={editRequest.requestType}
                  onChange={(e) =>
                    setEditRequest({ ...editRequest, requestType: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                />
                <textarea
                  value={editRequest.description}
                  onChange={(e) =>
                    setEditRequest({ ...editRequest, description: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                />
                <div className="flex justify-between">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="text-gray-500">
                    Cancel
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
