"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { collection, query, getDocs, where, updateDoc, doc } from "firebase/firestore";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const ConfirmDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const user = auth.currentUser;

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      setError("");

      if (!user) {
        setError("You must be logged in to view donations.");
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(firestore, "donations"), where("orphanageId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        const donationList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDonations(donationList);
      } catch (err) {
        setError("Failed to load donations: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const handleDonationStatusUpdate = async (donationId, status) => {
    try {
      const donationRef = doc(firestore, "donations", donationId);
      await updateDoc(donationRef, {
        confirmed: status,
      });
      setDonations((prevDonations) =>
        prevDonations.map((donation) =>
          donation.id === donationId ? { ...donation, confirmed: status } : donation
        )
      );
    } catch (err) {
      setError("Failed to update donation status: " + err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold text-gray-800 text-center pb-6">
            Donations for Your Requests
          </h2>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {donations.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No donations yet.</p>
          ) : (
            <div className="space-y-4">
              {donations.map((donation) => (
                <div key={donation.id} className="bg-gray-100 p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold">{donation.donationType}</h3>
                  <p className="text-gray-700">{donation.foodDescription || "No description available"}</p>
                  <p className="mt-2 text-sm">
                    <strong>Donor Email:</strong> {donation.donorEmail}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Amount:</strong> {donation.amount || "N/A"}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-md ${
                        donation.confirmed ? "bg-green-500" : "bg-yellow-400"
                      } text-white`}
                    >
                      {donation.confirmed ? "Confirmed" : "Pending"}
                    </span>
                  </p>

                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() => handleDonationStatusUpdate(donation.id, true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                    >
                      Yes
                    </button>

                    <button
                      onClick={() => handleDonationStatusUpdate(donation.id, false)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmDonations;
