"use client";

import { useEffect, useState } from "react";
// import { firestore } from "@/lib/firebase";
import { firestore } from "../../lib/firebase";

import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { FaTshirt, FaUtensils, FaMoneyBillWave } from "react-icons/fa";

export default function PublicDonationsList() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const q = query(collection(firestore, "publicDonations"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDonations(data);
      } catch (error) {
        console.error("Error fetching public donations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const filteredDonations = selectedType === "All"
    ? donations
    : donations.filter((d) => d.donationType === selectedType.toLowerCase());

  const typeIcon = (type) => {
    switch (type) {
      case "food":
        return <FaUtensils className="inline mr-1 text-orange-500" />;
      case "money":
        return <FaMoneyBillWave className="inline mr-1 text-green-500" />;
      case "clothes":
        return <FaTshirt className="inline mr-1 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Latest Public Donations</h2>
        </div>

        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          {['All', 'Money', 'Clothes', 'Food'].map(type => (
            <button
              key={type}
              className={`px-4 py-2 border rounded-md text-sm ${
                selectedType === type
                  ? "bg-green-600 text-white"
                  : "border-gray-300 text-gray-700"
              }`}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : filteredDonations.length === 0 ? (
          <p className="text-center text-gray-400">No public donations found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonations.map((don) => (
              <div
                key={don.id}
                className="p-5 border rounded-lg shadow bg-white flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-1 capitalize">
                    {typeIcon(don.donationType)} {don.donationType} Donation
                  </h3>

                  <div className="text-sm text-gray-700 space-y-1">
                     <p><strong>Address:</strong> {don.address}</p>

                    {don.donationType === "money" && (
                      <p><strong>Amount:</strong> Rs {don.donationAmount}</p>
                    )}
                    {don.donationType === "clothes" && (
                      <>
                        <p><strong>Description:</strong> {don.clothesDesc}</p>
                        <p><strong>Quantity:</strong> {don.clothesQty}</p>
                      </>
                    )}
                    {don.donationType === "food" && (
                      <>
                        <p><strong>Type:</strong> {don.foodType}</p>
                        <p><strong>Quantity:</strong> {don.foodQty}</p>
                        <p><strong>Expires:</strong> {don.foodExpiry}</p>
                      </>
                    )}
                    <p className="text-gray-500 text-xs">Submitted on {new Date(don.timestamp?.seconds * 1000).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
