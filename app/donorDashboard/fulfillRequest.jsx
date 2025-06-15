// app/components/Request.tsx
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestType, setRequestType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [customType, setCustomType] = useState("");

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

  const handleAddRequest = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    if (!title.trim()) return setError("Title is required.");
    if (requestType === "Other" && !customType.trim()) return setError("Custom type is required.");
    if (
      (["Clothes", "Money"].includes(requestType) || (requestType === "Other" && customType)) &&
      (!quantity || isNaN(quantity) || Number(quantity) <= 0)
    ) {
      return setError("Valid quantity is required.");
    }

    try {
      const finalType = requestType === "Other" ? customType.trim() : requestType;
      const requestData = {
        title: title.trim(),
        requestType: finalType,
        description: description.trim(),
        orphanageId: user.uid,
        orphanageEmail: user.email,
        status: "Pending",
        timestamp: serverTimestamp(),
      };

      if (
        ["Clothes", "Money"].includes(requestType) ||
        (requestType === "Other" && quantity)
      ) {
        requestData.quantity = Number(quantity);
      }

      await addDoc(collection(firestore, "requests"), requestData);
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setRequestType("");
      setQuantity("");
      setCustomType("");
      setError("");
      location.reload();
    } catch (err) {
      setError("Add failed: " + err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto py-12 mt-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Requests</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            + Add Request
          </button>
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-gray-100 p-6 rounded-lg shadow hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{r.title}</h3>
              <p className="text-sm text-gray-600 mb-1">Type: {r.requestType}</p>
              {r.quantity && (
                <p className="text-sm text-gray-600">Quantity: {r.quantity}</p>
              )}
              {r.totalDonated > 0 && (
                <p className="text-sm text-gray-600">
                  Donated: {r.totalDonated} of {r.quantity}
                </p>
              )}
              <p className="text-sm text-gray-700 mt-2">{r.description}</p>
              <span
                className={`mt-4 inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  r.status === "Fulfilled"
                    ? "bg-green-600 text-white"
                    : "bg-yellow-400 text-gray-900"
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-[400px]">
              <h2 className="text-xl font-bold mb-4">New Request</h2>
              <form onSubmit={handleAddRequest} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="requestType">Type</Label>
                  <select
                    id="requestType"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
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
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                    />
                  </div>
                )}
                {(["Clothes", "Money"].includes(requestType) ||
                  (requestType === "Other" && customType)) && (
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-600 hover:text-black"
                  >
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
}
