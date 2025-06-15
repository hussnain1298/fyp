// components/ServicesDashboard.jsx
"use client";

import { useState, useEffect } from "react";
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

const categories = [
  "Academic Skills",
  "Technology & STEM",
  "Arts & Creativity",
  "Life Skills & Personal Development",
  "Career & Vocational Training",
  "Social & Emotional Learning",
];

export default function ServicesDashboard() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(firestore, "services"),
        where("orphanageId", "==", user.uid)
      );
      const snap = await getDocs(q);
      setServices(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetch();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    const user = auth.currentUser;
    if (!user) return;

    const isEdit = !!form.id;
    const payload = {
      ...form,
      numberOfStudents: Number(form.numberOfStudents),
      orphanageId: user.uid,
      orphanageEmail: user.email,
    };

    if (!payload.title || !payload.description || !payload.frequency || !payload.mode) {
      return setFormError("Please fill all required fields.");
    }

    try {
      setLoading(true);
      if (isEdit) {
        const ref = doc(firestore, "services", form.id);
        await updateDoc(ref, payload);
        setServices((prev) =>
          prev.map((s) => (s.id === form.id ? { ...s, ...payload } : s))
        );
      } else {
        await addDoc(collection(firestore, "services"), {
          ...payload,
          status: "Pending",
          timestamp: serverTimestamp(),
        });
        location.reload();
      }
      setModalOpen(false);
      setForm({});
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this service?")) return;
    await deleteDoc(doc(firestore, "services", id));
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="bg-white min-h-screen container mx-auto px-6 py-10 mt-16">
      <div className="flex justify-between mb-6">
        <h2 className="text-4xl font-bold text-gray-900">Services</h2>
        <button
          onClick={() => {
            setForm({});
            setEditMode(false);
            setModalOpen(true);
          }}
          className="bg-green-600 text-white py-2 px-4 rounded"
        >
          + Add Service
        </button>
      </div>

      <div className="space-y-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-gray-100 p-4 rounded-lg shadow flex justify-between items-start"
          >
            <div>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-gray-700">{s.description}</p>
              <p className="text-sm mt-1 text-gray-600">
                Frequency: {s.frequency}, Mode: {s.mode}, Duration: {s.duration},{" "}
                Students: {s.numberOfStudents}
              </p>
                <div className="flex  space-x-2 mt-2">
                <button
                  onClick={() => {
                    setForm(s);
                    setEditMode(true);
                    setModalOpen(true);
                  }}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="text-right space-y-2">
              <span
                className={`inline-block text-xs font-semibold px-2 py-1 rounded text-white ${
                  s.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                }`}
              >
                {s.status || "Pending"}
              </span>
           
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">
              {editMode ? "Edit Service" : "Add Service"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {formError && (
                <p className="text-sm text-red-600 text-center">{formError}</p>
              )}
              <div>
                <label className="block mb-1 font-medium">Title</label>
                <select
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1 font-medium">Frequency</label>
                  <select
                    value={form.frequency || ""}
                    onChange={(e) =>
                      setForm({ ...form, frequency: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block mb-1 font-medium">Mode</label>
                  <select
                    value={form.mode || ""}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="Online">Online</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Duration</label>
                <select
                  value={form.duration || ""}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="One Day">One Day</option>
                  <option value="One Week">One Week</option>
                  <option value="One Month">One Month</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">No. of Students</label>
                <input
                  type="number"
                  value={form.numberOfStudents || ""}
                  onChange={(e) =>
                    setForm({ ...form, numberOfStudents: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setForm({});
                    setFormError("");
                  }}
                  className="px-4 py-2 rounded border border-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  disabled={loading}
                >
                  {loading
                    ? editMode
                      ? "Saving..."
                      : "Posting..."
                    : editMode
                    ? "Save"
                    : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
