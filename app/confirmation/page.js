"use client";  // Mark the file as client-side

import { useState, useEffect } from "react";
import { firestore, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

function OrphanageDashboard() {
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch the logged-in user (orphanage)
        const user = auth.currentUser;

        if (!user) {
          setError("You must be logged in to view donations.");
          setLoading(false);
          return;
        }

        // Fetch orphanage's requests based on the logged-in user
        const orphanageId = user.uid; // Get orphanageId from the logged-in user

        // Fetch the orphanage's requests
        const requestsRef = collection(firestore, "requests");
        const requestsQuery = query(requestsRef, where("orphanageId", "==", orphanageId));
        const requestsSnapshot = await getDocs(requestsQuery);

        const fetchedRequests = requestsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(fetchedRequests);

        // Fetch donations related to the orphanage's requests
        const donationsRef = collection(firestore, "donations");
        const donationsQuery = query(
          donationsRef,
          where("requestId", "in", fetchedRequests.map((request) => request.id))
        );
        const querySnapshot = await getDocs(donationsQuery);

        if (querySnapshot.empty) {
          setError("No donations found.");
        } else {
          const donationsData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setDonations(donationsData);
        }
      } catch (err) {
        setError("Error fetching donations: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="flex justify-center items-start mt-20 min-h-screen">
      <div className="max-w-lg w-full p-6 bg-white rounded-md shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Donations for Your Requests/Services</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {loading ? (
          <p className="text-center">Loading...</p>
        ) : (
          <div>
            {donations.length === 0 ? (
              <p>No donations found.</p>
            ) : (
              donations.map((donation) => (
                <div key={donation.id} className="p-4 border-b">
                  <p><strong>Donor:</strong> {donation.donorEmail}</p>
                  <p><strong>Donation Type:</strong> {donation.donationType}</p>
                  {donation.donationType === "money" && <p><strong>Amount:</strong> ${donation.amount}</p>}
                  {donation.donationType === "clothes" && <p><strong>Number of Clothes:</strong> {donation.numClothes}</p>}
                  {donation.donationType === "food" && <p><strong>Food Description:</strong> {donation.foodDescription}</p>}
                  {donation.donationType === "services" && (
                    <>
                      <p><strong>Service:</strong> {donation.service}</p>
                      <p><strong>Service Description:</strong> {donation.serviceDescription}</p>
                    </>
                  )}
                  <p><strong>Confirmed:</strong> {donation.confirmed ? "Yes" : "No"}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrphanageDashboard;