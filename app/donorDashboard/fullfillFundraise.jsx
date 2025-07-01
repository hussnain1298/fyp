"use client";

import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";

export default function FulfillFundRaise() {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [donating, setDonating] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchFundraisers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(collection(firestore, "fundraisers"))
        );
        const list = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((f) => f.status === "Pending");

        const orphanageIds = [...new Set(list.map((f) => f.orphanageId).filter(Boolean))];
        const orphanageMap = {};

        if (orphanageIds.length > 0) {
          const batches = [];
          while (orphanageIds.length) {
            batches.push(orphanageIds.splice(0, 10));
          }

          for (const batch of batches) {
            const orphanSnap = await getDocs(
              query(collection(firestore, "users"), where("__name__", "in", batch))
            );
            orphanSnap.forEach((doc) => {
              orphanageMap[doc.id] = doc.data();
            });
          }
        }

        const enriched = list.map((f) => ({
          ...f,
          orphanageName: orphanageMap[f.orphanageId]?.orgName || "N/A",
          orphanageLocation: orphanageMap[f.orphanageId]?.city || "N/A",
        }));

        setFundraisers(enriched);
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFundraisers();
  }, []);

  const closeModal = () => {
    setActiveModalId(null);
    setDonationAmount("");
    setAmountError("");
  };

  const handleDonate = async (fundraiserId) => {
    if (!user) return alert("Please log in as donor to donate.");

    const trimmed = donationAmount.trim();
    const amountNum = Number(trimmed);

    if (!trimmed || isNaN(amountNum)) {
      setAmountError("Please enter a valid numeric amount.");
      return;
    }

    if (amountNum <= 0 || /^0\d+/.test(trimmed)) {
      setAmountError("Amount must be greater than zero, no leading zeros.");
      return;
    }

    if (amountNum > 1000000) {
      setAmountError("Amount must be ≤ 1,000,000.");
      return;
    }

    setAmountError("");
    setDonating(true);

    try {
      // Add donation record
      await addDoc(collection(firestore, "fundraisers", fundraiserId, "donations"), {
        donorId: user.uid,
        amount: amountNum,
        status: "pending",
        timestamp: serverTimestamp(),
      });

      // Get fundraiser doc
      const fundraiserRef = doc(firestore, "fundraisers", fundraiserId);
      const fundraiserSnap = await getDocs(query(collection(firestore, "fundraisers"), where("__name__", "==", fundraiserId)));
      const fundraiserDoc = fundraiserSnap.docs[0];
      const current = fundraiserDoc?.data();

      const updatedRaised = (current?.raisedAmount || 0) + amountNum;
      const isFulfilled = updatedRaised >= (current?.totalAmount || Infinity);

   
      alert("✅ Thank you! Awaiting orphanage confirmation.");
      closeModal();
    } catch (err) {
      console.error("Donation failed:", err);
      setAmountError("Donation failed: " + err.message);
    } finally {
      setDonating(false);
    }
  };

  const DonateModal = ({ fundraiserId }) => {
    if (typeof window === "undefined") return null;
    return ReactDOM.createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4"
        onClick={closeModal}
      >
        <div
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeModal}
            className="absolute top-3 right-3 text-gray-700 hover:text-gray-900 text-xl font-bold"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-4">Donate to Fundraiser</h2>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter amount (1 to 1,000,000)"
            value={donationAmount}
            onChange={(e) => {
              const input = e.target.value;
              if (/^\d*$/.test(input)) {
                setDonationAmount(input);
                setAmountError("");
              }
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {amountError && <p className="text-sm text-red-600 mt-1">{amountError}</p>}
          <button
            onClick={() => handleDonate(fundraiserId)}
            disabled={donating}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition"
          >
            {donating ? "Processing..." : "Donate Now"}
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="container mx-auto p-8 mt-16">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 border-b pb-2">
        FUNDRAISER REQUESTS
      </h2>

      {error && <p className="text-red-500 text-center">{error}</p>}
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <div className="space-y-6">
          {fundraisers.map((f) => (
            <div key={f.id} className="bg-gray-100 p-6 rounded shadow relative">
              <h3 className="text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-gray-700">{f.description}</p>
              <p className="text-sm mt-2">Raised: Rs. {f.raisedAmount || 0} of Rs. {f.totalAmount}</p>
              <p className="text-sm text-gray-600"><strong>Orphanage:</strong> {f.orphanageName}</p>
              <p className="text-sm text-gray-600 mb-2"><strong>Location:</strong> {f.orphanageLocation}</p>

              <button
                onClick={() => setActiveModalId(f.id)}
                className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700"
              >
                Donate
              </button>

              {activeModalId === f.id && <DonateModal fundraiserId={f.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
