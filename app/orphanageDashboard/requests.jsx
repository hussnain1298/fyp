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

export default function Request() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
              where("orphanageId", "==", user.uid),
              where("confirmed", "==", true)
            );
            const donationSnapshot = await getDocs(donationQuery);

            let totalDonated = 0;
            donationSnapshot.forEach((d) => {
              if (data.requestType === "Money") {
                totalDonated += Number(d.data().amount || 0);
              } else if (data.requestType === "Clothes") {
                totalDonated += Number(d.data().numClothes || 0);
              }
            });

            const isFulfilled = data.quantity && totalDonated >= Number(data.quantity);
            if (isFulfilled && data.status !== "Fulfilled") {
              await updateDoc(doc(firestore, "requests", docRef.id), {
                status: "Fulfilled",
              });
            }

            return {
              id: docRef.id,
              ...data,
              totalDonated,
              status: isFulfilled ? "Fulfilled" : data.status,
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

  const handleDelete = async (id) => {
    if (!confirm("Delete this request?")) return;
    await deleteDoc(doc(firestore, "requests", id));
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (!form.title?.trim()) return setFormError("Title is required.");
    if (form.requestType === "Other" && !form.customType?.trim()) return setFormError("Custom type is required.");
    if ((["Clothes", "Money"].includes(form.requestType) || form.customType) && (!form.quantity || isNaN(form.quantity) || Number(form.quantity) <= 0)) {
      return setFormError("Valid quantity is required.");
    }

    try {
      const payload = {
        title: form.title.trim(),
        requestType: form.requestType === "Other" ? form.customType.trim() : form.requestType,
        description: form.description.trim(),
        quantity: form.quantity ? Number(form.quantity) : undefined,
        orphanageId: user.uid,
        orphanageEmail: user.email,
        status: "Pending",
        timestamp: serverTimestamp(),
      };

      if (form.id) {
        await updateDoc(doc(firestore, "requests", form.id), payload);
        setRequests((prev) => prev.map((r) => (r.id === form.id ? { ...r, ...payload } : r)));
      } else {
        await addDoc(collection(firestore, "requests"), payload);
        location.reload();
      }

      setForm({});
      setIsModalOpen(false);
      setFormError("");
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto px-6 py-10 mt-16">
        <div className="flex justify-between mb-6">
          <h2 className="text-4xl font-bold">Requests</h2>
          <button
            onClick={() => {
              setForm({});
              setEditMode(false);
              setIsModalOpen(true);
            }}
            className="bg-green-600 text-white py-2 px-4 rounded"
          >
            + Add Request
          </button>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="bg-gray-100 p-4 rounded-lg shadow flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">{r.title}</h3>
                <p className="text-gray-700">{r.description}</p>
                <p className="text-sm mt-1 text-gray-600">
                  Type: {r.requestType}
                </p>
                <p className="text-sm mt-1 text-gray-600">
                Quantity: {r.quantity || "-"}, Donated: {r.totalDonated || 0}
                </p>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => {
                      setForm(r);
                      setEditMode(true);
                      setIsModalOpen(true);
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
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded text-white ${
                  r.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                }`}>
                  {r.status || "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
              <h2 className="text-2xl font-bold mb-4">{editMode ? "Edit Request" : "Add Request"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && <p className="text-red-600 text-sm">{formError}</p>}
                <div>
                  <Label>Title</Label>
                  <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    value={form.requestType || ""}
                    onChange={(e) => setForm({ ...form, requestType: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Food">Food</option>
                    <option value="Clothes">Clothes</option>
                    <option value="Money">Money</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {form.requestType === "Other" && (
                  <div>
                    <Label>Custom Type</Label>
                    <Input value={form.customType || ""} onChange={(e) => setForm({ ...form, customType: e.target.value })} />
                  </div>
                )}
                {(["Clothes", "Money"].includes(form.requestType) || form.customType) && (
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                )}
                <div className="flex justify-between">
                  <button type="button" onClick={() => { setIsModalOpen(false); setForm({}); setFormError(""); }} className="px-4 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
                    {editMode ? "Save" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
