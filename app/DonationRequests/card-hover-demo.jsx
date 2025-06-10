"use client";

import { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

export default function RequestsHoverDemo() {
  const [cityFilteredRequests, setCityFilteredRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [city, setCity] = useState("Detecting...");
  const [userCityFilter, setUserCityFilter] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const effectiveCity = userCityFilter.trim() || city.trim();

  const [donationNote, setDonationNote] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);

  // Geolocation fetch with error handling
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
          );
          if (!res.ok) throw new Error("Failed to fetch location");
          const data = await res.json();
          setCity(data.city || data.locality || data.principalSubdivision || "Unknown");
        } catch (err) {
          console.error("Geolocation fetch error:", err);
          setCity("Unknown");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setCity("Unknown");
      }
    );
  }, []);

  // Cleanup fulfilled requests older than 24 hours
  useEffect(() => {
    const cleanupOldFulfilledRequests = async () => {
      const q = query(collection(firestore, "requests"), where("status", "==", "Fulfilled"));
      const snapshot = await getDocs(q);
      const now = Timestamp.now();
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        const fulfilledAt = data.fulfilledAt || data.updatedAt || data.timestamp;
        if (fulfilledAt) {
          const diffHours = (now.seconds - fulfilledAt.seconds) / 3600;
          if (diffHours >= 24) {
            await deleteDoc(doc(firestore, "requests", docSnap.id));
          }
        }
      });
    };
    cleanupOldFulfilledRequests();
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetchOrphanages = async () => {
      const orphanSnap = await getDocs(
        query(collection(firestore, "users"), where("userType", "==", "Orphanage"))
      );
      const orphanMap = {};
      const normalizedCity = effectiveCity.toLowerCase();
      orphanSnap.forEach((doc) => {
        const data = doc.data();
        const cityMatch = (data.city || "").trim().toLowerCase();
        if (
          !normalizedCity ||
          ["detecting...", "unknown"].includes(normalizedCity) ||
          cityMatch === normalizedCity
        ) {
          orphanMap[doc.id] = data;
        }
      });
      return orphanMap;
    };

    const orphanMapPromise = fetchOrphanages();

    const q = query(collection(firestore, "requests"));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const orphanMap = await orphanMapPromise;
      const requests = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (orphanMap[data.orphanageId]) {
          requests.push({ id: doc.id, ...data, orphanInfo: orphanMap[data.orphanageId] });
        }
      });
      setCityFilteredRequests(requests);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveCity]);

  useEffect(() => {
    const start = (page - 1) * pageSize;
    const filtered =
      selectedType === "All"
        ? cityFilteredRequests
        : cityFilteredRequests.filter(
            (r) => r.requestType.toLowerCase() === selectedType.toLowerCase()
          );
    setFilteredRequests(filtered.slice(start, start + pageSize));
  }, [selectedType, cityFilteredRequests, page]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) {
        setUserType(null);
        return;
      }
      const snap = await getDoc(doc(firestore, "users", u.uid));
      const data = snap.exists() ? snap.data() : {};
      setUserType(data.userType || null);
    });
    return unsubscribe;
  }, []);

  const handleDonateClick = (req) => {
    if (!user) {
      alert("Please login to donate.");
      return;
    }
    if (userType !== "Donor") {
      alert("Only donors can make donations.");
      return;
    }
    if (req.status === "Fulfilled") {
      alert("This request is fulfilled and no longer accepting donations.");
      return;
    }
    setActiveModalId(req.id);
    setDonationNote("");
    setDonationAmount("");
    setError("");
  };

  const handleDonationSubmit = async (req) => {
    setError("");
    try {
      if (!user) {
        setError("You must be logged in to donate.");
        return;
      }

      if (req.status === "Fulfilled") {
        setError("Cannot donate to a fulfilled request.");
        return;
      }

      if (req.requestType === "Money" && (!donationAmount || Number(donationAmount) <= 0)) {
        setError("Please enter a valid donation amount.");
        return;
      }

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: req.orphanageId,
        requestId: req.id,
        donationType: req.requestType,
        amount: req.requestType === "Money" ? Number(donationAmount) : null,
        numClothes: req.requestType === "Clothes" ? req.quantity || null : null,
        foodDescription: req.requestType === "Food" ? req.description : null,
        description: donationNote || "",
        confirmed: false,
        timestamp: serverTimestamp(),
      };

      console.log("Donation data to submit:", donationData);

      const donationRef = await addDoc(collection(firestore, "donations"), donationData);

      await updateDoc(doc(firestore, "requests", req.id), {
        donations: arrayUnion(donationRef.id),
      });

      setActiveModalId(null);
      setDonationNote("");
      setDonationAmount("");
      alert("Donation submitted for review.");
    } catch (err) {
      console.error("Donation submission error:", err);
      setError("Donation failed: " + err.message);
    }
  };

  const totalPages = Math.ceil(
    (selectedType === "All"
      ? cityFilteredRequests.length
      : cityFilteredRequests.filter((r) => r.requestType.toLowerCase() === selectedType.toLowerCase()).length) /
      pageSize
  );

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="bg-green-100 text-green-700 font-medium px-4 py-2 rounded shadow">
            📍 Showing requests near <strong>{effectiveCity}</strong>
          </p>
          <input
            type="text"
            value={userCityFilter}
            onChange={(e) => setUserCityFilter(e.target.value)}
            placeholder="Filter by city"
            className="border-b border-gray-300 focus:outline-none focus:border-green-600 px-2 py-1"
          />
        </div>

        <div className="flex gap-4 mb-6">
          {"All,Food,Money,Clothes".split(",").map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded border ${
                selectedType === type ? "bg-green-600 text-white" : "border-gray-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="text-center text-gray-400">No requests found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-5 border rounded-lg shadow bg-white">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">
                    {req.requestType === "Other" && req.quantity ? req.quantity : req.requestType}
                  </h3>
                  <span
                    className={`inline-block px-2 py-1 rounded text-white text-xs ${
                      req.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{req.description}</p>

                <p className="text-sm text-gray-500">Orphanage: {req.orphanInfo?.orgName || "N/A"}</p>
                <p className="text-sm text-gray-500 mb-4">Location: {req.orphanInfo?.city || "N/A"}</p>

                <button
                  onClick={() => handleDonateClick(req)}
                  disabled={req.status === "Fulfilled"}
                  className={`py-2 px-6 rounded text-white ${
                    req.status === "Fulfilled"
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Donate
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-8 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${page === i + 1 ? "bg-green-600 text-white" : "bg-gray-100"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {activeModalId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Donation Note</h3>

            <textarea
              value={donationNote}
              onChange={(e) => setDonationNote(e.target.value)}
              placeholder="Write something about your donation..."
              rows={4}
              className="w-full border border-gray-300 rounded p-2"
            />

            {filteredRequests.find((r) => r.id === activeModalId)?.requestType === "Money" && (
              <div className="mt-4">
                <label className="block font-semibold text-sm mb-1">Donation Amount</label>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="Enter donation amount"
                  className="w-full border border-gray-300 rounded p-2"
                  required
                  min={1}
                />
              </div>
            )}

            {error && <p className="text-red-600 mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setActiveModalId(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const req = filteredRequests.find((r) => r.id === activeModalId);
                  if (req) handleDonationSubmit(req);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
