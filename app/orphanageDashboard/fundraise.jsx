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

const MAX_DONATION_AMOUNT = 1000000;

const FundRaise = () => {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editFundraiser, setEditFundraiser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    customTitle: "",
    description: "",
    totalAmount: "",
  });

  const titleOptions = ["Books", "School Uniforms", "Nutrition", "Medical Aid", "Other"];

  useEffect(() => {
    const fetch = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(collection(firestore, "fundraisers"), where("orphanageId", "==", user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFundraisers(list);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this fundraiser?")) return;
    await deleteDoc(doc(firestore, "fundraisers", id));
    setFundraisers((prev) => prev.filter((f) => f.id !== id));
  };

  const handleEdit = (f) => {
    setEditFundraiser(f);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const { title, description, totalAmount } = editFundraiser;
    const amt = Number(totalAmount);
    if (!title || !description || isNaN(amt) || amt < 1 || amt > MAX_DONATION_AMOUNT) {
      return setError("All fields are required. Amount must be between RS. 1 and RS. 1,000,000.");
    }
    const ref = doc(firestore, "fundraisers", editFundraiser.id);
    const status = (editFundraiser.raisedAmount || 0) >= amt ? "Fulfilled" : "Pending";
    await updateDoc(ref, { title, description, totalAmount: amt, status });
    setFundraisers((prev) =>
      prev.map((f) =>
        f.id === editFundraiser.id ? { ...f, title, description, totalAmount: amt, status } : f
      )
    );
    setIsEditing(false);
  };

  const handleSubmitNew = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const finalTitle = form.title === "Other" ? form.customTitle.trim() : form.title;
    const amt = Number(form.totalAmount);
    if (!finalTitle || !form.description || isNaN(amt) || amt < 1 || amt > MAX_DONATION_AMOUNT) {
      return setError("Please complete all fields. Valid amount required.");
    }

    const snap = await getDoc(doc(firestore, "users", user.uid));
    const name = snap.exists() ? snap.data().name || "" : "";
    const data = {
      ...form,
      title: finalTitle,
      totalAmount: amt,
      raisedAmount: 0,
      orphanageId: user.uid,
      orphanageName: name,
      image: "/raise.jpg",
      status: "Pending",
    };

    const ref = await addDoc(collection(firestore, "fundraisers"), data);
    setFundraisers((prev) => [...prev, { id: ref.id, ...data }]);
    setForm({ title: "", customTitle: "", description: "", totalAmount: "" });
    setModalOpen(false);
  };

  return (
    <div className="container mx-auto mt-16 px-6">
         <h2 className="text-4xl font-bold text-gray-800 mb-6 border-b pb-2 text-center">
        FUNDRAISE
        </h2>
      <div className="flex justify-end mb-6">
       
        <button
          onClick={() => {
            setForm({ title: "", customTitle: "", description: "", totalAmount: "" });
            setModalOpen(true);
          }}
          className="bg-green-600 text-white py-2 px-4 rounded"
        >
          + Fundraiser
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-4">
          {fundraisers.map((f) => (
            <div key={f.id} className="bg-gray-100 p-4 rounded shadow flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-gray-700">{f.description}</p>
                <p className="text-sm mt-1 text-gray-600">
                  Raised: Rs.{f.raisedAmount || 0} / Rs.{f.totalAmount}
                </p>
                <div className="flex space-x-2 mt-2">
                  <button onClick={() => handleEdit(f)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(f.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
                    Delete
                  </button>
                </div>
              </div>
              <div>
                <span
                  className={`inline-block text-xs font-semibold px-2 py-1 rounded text-white ${
                    f.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                  }`}
                >
                  {f.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modalOpen || isEditing) && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <form
            onSubmit={isEditing ? handleSaveEdit : handleSubmitNew}
            className="bg-white p-6 rounded-lg shadow-xl w-[400px] space-y-4"
          >
            <h2 className="text-xl font-bold">{isEditing ? "Edit" : "New"} Fundraiser</h2>
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!isEditing && (
              <>
                <select
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Title</option>
                  {titleOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {form.title === "Other" && (
                  <input
                    type="text"
                    placeholder="Custom Title"
                    className="w-full p-2 border rounded"
                    value={form.customTitle}
                    onChange={(e) => setForm({ ...form, customTitle: e.target.value })}
                  />
                )}
              </>
            )}

            <textarea
              rows="3"
              placeholder="Description"
              className="w-full p-2 border rounded"
              value={isEditing ? editFundraiser.description : form.description}
              onChange={(e) =>
                isEditing
                  ? setEditFundraiser({ ...editFundraiser, description: e.target.value })
                  : setForm({ ...form, description: e.target.value })
              }
              required
            />

            <input
              type="number"
              placeholder="Total Amount"
              className="w-full p-2 border rounded"
              value={isEditing ? editFundraiser.totalAmount : form.totalAmount}
              onChange={(e) =>
                isEditing
                  ? setEditFundraiser({ ...editFundraiser, totalAmount: e.target.value })
                  : setForm({ ...form, totalAmount: e.target.value })
              }
              required
            />

            <div className="flex justify-end">
                 <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded ">
                {isEditing ? "Save" : "Post"}
              </button>

              <button type="button"  className="px-4 py-2 rounded border border-gray-400 ml-4" onClick={() => (isEditing ? setIsEditing(false) : setModalOpen(false))}>
                Cancel
              </button>
           
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FundRaise;
