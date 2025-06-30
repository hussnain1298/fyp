"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  where,
} from "firebase/firestore";
import { Poppins } from "next/font/google";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const PAGE_SIZE = 6;

export default function FulfillRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [donationNote, setDonationNote] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const [page, setPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const reqSnap = await getDocs(collection(firestore, "requests"));
        const rawRequests = reqSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })).filter(r => r.status === "Pending");

        const orphanageIds = [...new Set(rawRequests.map(r => r.orphanageId).filter(Boolean))];
        const orphanageMap = {};

        if (orphanageIds.length > 0) {
          const batches = [];
          while (orphanageIds.length) batches.push(orphanageIds.splice(0, 10));

          for (const batch of batches) {
            const orphanSnap = await getDocs(query(
              collection(firestore, "users"),
              where("__name__", "in", batch)
            ));
            orphanSnap.forEach(doc => {
              orphanageMap[doc.id] = doc.data();
            });
          }
        }

        const enriched = await Promise.all(rawRequests.map(async (r) => {
          const donationSnap = await getDocs(query(
            collection(firestore, "donations"),
            where("requestId", "==", r.id),
            where("confirmed", "==", true)
          ));

          let totalDonated = 0;
          donationSnap.forEach(d => {
            if (r.requestType === "Money") {
              totalDonated += Number(d.data().amount || 0);
            } else if (r.requestType === "Clothes") {
              totalDonated += Number(d.data().numClothes || 0);
            }
          });

          return {
            ...r,
            totalDonated,
            orphanInfo: orphanageMap[r.orphanageId] || {},
          };
        }));

        setRequests(enriched);
        setPage(1);
      } catch (err) {
        setError("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleFulfill = async (request) => {
    const user = auth.currentUser;
    if (!user) return alert("Login required");

    if ((request.requestType === "Money" || request.requestType === "Clothes") &&
      (!donationAmount || isNaN(donationAmount) || Number(donationAmount) <= 0)) {
      return alert("Enter a valid donation amount");
    }

    try {
      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: request.orphanageId,
        requestId: request.id,
        donationType: request.requestType,
        amount: request.requestType === "Money" ? Number(donationAmount) : null,
        numClothes: request.requestType === "Clothes" ? Number(donationAmount) : null,
        foodDescription: request.requestType === "Food" ? request.description : null,
        description: donationNote,
        confirmed: false,
        timestamp: new Date(),
      };

      const donationRef = await addDoc(collection(firestore, "donations"), donationData);
      await updateDoc(doc(firestore, "requests", request.id), {
        donations: arrayUnion(donationRef.id),
      });

      alert("Donation submitted!");
      setActiveModalId(null);
      setDonationNote("");
      setDonationAmount("");
    } catch (err) {
      alert("Error submitting donation: " + err.message);
    }
  };

  const totalPages = Math.ceil(requests.length / PAGE_SIZE);
  const paginatedRequests = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-2">REQUESTS</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {loading ? (
          <p className="text-center">Loading...</p>
        ) : (
          <div className="space-y-6">
            {paginatedRequests.map((r) => (
              <div key={r.id} className="bg-gray-100 p-6 rounded shadow relative">
                <span className="absolute top-4 right-4 px-3 py-1 rounded text-white text-sm font-semibold bg-yellow-500">
                  {r.status}
                </span>

                <h3 className="text-lg font-bold mb-1">{r.title || r.requestType}</h3>
                <p className="text-sm text-gray-600"><strong>Type:</strong> {r.requestType}</p>
                <p className="text-gray-700">{r.description}</p>

                {r.requestType !== "Food" && r.quantity && (
                  <p className="text-sm mt-2">Donated: {r.totalDonated} of {r.quantity}</p>
                )}

                <p className="text-sm text-gray-600"><strong>Orphanage:</strong> {r.orphanInfo?.orgName || "N/A"}</p>
                <p className="text-sm text-gray-600 mb-2"><strong>Location:</strong> {r.orphanInfo?.city || "N/A"}</p>

                <button
                  onClick={() => setActiveModalId(r.id)}
                  className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700"
                >
                  Donate
                </button>

                {activeModalId === r.id && (
                  <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
                      <h3 className="text-lg font-bold mb-4">Add Donation</h3>
                      <Textarea
                        value={donationNote}
                        onChange={(e) => setDonationNote(e.target.value)}
                        placeholder="Write something about your donation..."
                        rows={3}
                      />
                      {["Money", "Clothes"].includes(r.requestType) && (
                        <div className="mt-4">
                          <label className="block mb-1 font-medium">
                            {r.requestType === "Money" ? "Donation Amount" : "Clothes Quantity"}
                          </label>
                          <Input
                            type="number"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(e.target.value)}
                            placeholder={`Enter ${r.requestType.toLowerCase()}`}
                            min={1}
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => handleFulfill(r)} className="bg-green-600 text-white">
                          Submit
                        </Button>
                        <Button onClick={() => setActiveModalId(null)} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-10 space-x-2">
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
      </div>
    </div>
  );
}
