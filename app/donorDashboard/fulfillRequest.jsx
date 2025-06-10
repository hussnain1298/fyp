'use client';

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
  arrayUnion
} from "firebase/firestore";
import { Poppins } from "next/font/google";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const FulfillRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [donationNote, setDonationNote] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view requests.");
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(firestore, "requests"));
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

  const handleFulfill = async (request) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to donate.");
        return;
      }

      if (request.requestType === "Money" && !donationAmount) {
        setError("Please enter a donation amount.");
        return;
      }

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: request.orphanageId,
        requestId: request.id,
        donationType: request.requestType,
        amount: request.requestType === "Money" ? Number(donationAmount) : null,
        numClothes: request.requestType === "Clothes" ? request.quantity || null : null,
        foodDescription: request.requestType === "Food" ? request.description : null,
        description: donationNote,
        confirmed: false,
        timestamp: new Date(),
      };

      const donationRef = await addDoc(collection(firestore, "donations"), donationData);

      await updateDoc(doc(firestore, "requests", request.id), {
        donations: arrayUnion(donationRef.id),
      });

      setActiveModalId(null);
      setDonationNote("");
      setDonationAmount("");
      alert("Donation submitted for review.");
    } catch (err) {
      setError("Donation failed: " + err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6">Requests</h2>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {requests.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No requests yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="bg-gray-100 p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-bold">{request.title || request.requestType}</h3>
                    <span
                      className={`px-2 py-1 rounded text-white text-xs font-medium ${
                        request.status === "Pending" ? "bg-yellow-500" : "bg-green-600"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="text-gray-700">{request.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Request ID:</strong> {request.id}
                  </p>

                  <div className="flex space-x-4 mt-4">
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-400"
                      onClick={() =>
                        router.push(`/chat?requestId=${request.id}&userEmail=${auth.currentUser?.email}`)
                      }
                    >
                      View Chat
                    </button>

                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                      onClick={() => setActiveModalId(request.id)}
                    >
                      Donate
                    </button>
                  </div>

                  {activeModalId === request.id && (
                    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
                      <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Add Donation Note</h3>

                        <Textarea
                          value={donationNote}
                          onChange={(e) => setDonationNote(e.target.value)}
                          placeholder="Write something about your donation..."
                          rows={4}
                        />

                        {request.requestType === "Money" && (
                          <div className="mt-4">
                            <label className="block font-semibold text-sm mb-1">Donation Amount</label>
                            <Input
                              type="number"
                              value={donationAmount}
                              onChange={(e) => setDonationAmount(e.target.value)}
                              placeholder="Enter donation amount"
                              required
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                          <Button onClick={() => setActiveModalId(null)} variant="outline">Cancel</Button>
                          <Button onClick={() => handleFulfill(request)} className="bg-green-600 text-white">
                            Submit
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FulfillRequests;
