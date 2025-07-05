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
  serverTimestamp
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PAGE_SIZE = 5;

export default function RequestsDashboard() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchRequests = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setLoading(true);

      try {
        const q = query(
          collection(firestore, "requests"),
          where("orphanageId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRequests(list);
      } catch (err) {
        toast.error("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const totalPages = Math.ceil(requests.length / PAGE_SIZE);
  const paginatedRequests = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    const user = auth.currentUser;
    if (!user) return;

    const isEdit = !!form.id;
    const payload = {
      title: form.title?.trim(),
      description: form.description?.trim(),
      requestType: form.requestType,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      orphanageId: user.uid,
      orphanageEmail: user.email,
      status: "Pending",
      timestamp: serverTimestamp()
    };

    if (!payload.title || !payload.description || (payload.quantity && payload.quantity <= 0)) {
      return setFormError("Please provide Title, Description and valid Quantity if applicable.");
    }

    try {
      setLoading(true);
      if (isEdit) {
        const ref = doc(firestore, "requests", form.id);
        await updateDoc(ref, payload);
        setRequests((prev) => prev.map((r) => (r.id === form.id ? { ...r, ...payload } : r)));
        toast.success("Request updated successfully");
      } else {
        const ref = await addDoc(collection(firestore, "requests"), payload);
        setRequests((prev) => [...prev, { id: ref.id, ...payload }]);
        toast.success("Request posted successfully");
      }
      setModalOpen(false);
      setForm({});
    } catch (err) {
      setFormError(err.message);
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this request?")) return;
    await deleteDoc(doc(firestore, "requests", id));
    setRequests((prev) => prev.filter((r) => r.id !== id));
    toast.success("Request deleted successfully");
  };

  return (
    <div className="bg-white min-h-screen container mx-auto px-6 py-10 mt-16">
      <ToastContainer />
      <h2 className="text-4xl font-bold text-gray-800 mb-6 border-b pb-2 text-center">REQUESTS</h2>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setForm({});
            setEditMode(false);
            setModalOpen(true);
          }}
          className="bg-green-600 text-white py-2 px-4 rounded"
        >
          + New Request
        </button>
      </div>

      <div className="space-y-4">
        {paginatedRequests.map((r) => (
          <div
            key={r.id}
            className="bg-gray-100 p-4 rounded-lg shadow flex justify-between items-start"
          >
            <div>
              <h3 className="text-lg font-bold">{r.title}</h3>
              <p className="text-gray-700">{r.description}</p>
              <p className="text-sm mt-1 text-gray-600">
                Type: {r.requestType}, Quantity: {r.quantity || "-"}
              </p>
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => {
                    setForm(r);
                    setEditMode(true);
                    setModalOpen(true);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block text-xs font-semibold px-2 py-1 rounded text-white ${
                  r.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                }`}
              >
                {r.status || "Pending"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">
              {editMode ? "Edit Request" : "Add Request"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {formError && <p className="text-sm text-red-600 text-center">{formError}</p>}
              <div>
                <label className="block mb-1 font-medium">Title</label>
                <input
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Request Type</label>
                <select
                  value={form.requestType || ""}
                  onChange={(e) => setForm({ ...form, requestType: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select type</option>
                  <option value="Money">Money</option>
                  <option value="Clothes">Clothes</option>
                  <option value="Food">Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {form.requestType !== "" && (
                <div>
                  <label className="block mb-1 font-medium">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity || ""}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  disabled={loading}
                >
                  {loading ? (editMode ? "Saving..." : "Posting...") : editMode ? "Save" : "Post"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setForm({});
                    setFormError("");
                  }}
                  className="px-4 py-2 rounded border border-gray-400 ml-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
