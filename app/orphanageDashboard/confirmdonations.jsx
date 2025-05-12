"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

const ConfirmedRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view requests.");
        return;
      }

      try {
        // Query donations collection where orphanageId matches the current user's UID
        const q = query(
          collection(firestore, "donations"),
          where("orphanageId", "==", user.uid) // Fetch donations related to this orphanage
        );
        const querySnapshot = await getDocs(q);

        // Create an array of requests (each donation corresponds to a request)
        const requestList = await Promise.all(
          querySnapshot.docs.map(async (document) => {
            const donationData = document.data();

            // Fetch the related request for this donation
            const requestDocRef = doc(firestore, "requests", donationData.requestId);
            const requestDocSnap = await getDoc(requestDocRef);

            if (!requestDocSnap.exists()) {
              throw new Error("Request not found.");
            }

            const requestData = requestDocSnap.data();

            // Combine donation and request data
            return {
              id: requestDocSnap.id,
              ...requestData,
              donationId: document.id,
              donationType: donationData.donationType,
              donationAmount: donationData.amount,
              donationStatus: donationData.confirmed ? "Confirmed" : "Pending",
              donationClothesCount: donationData.numClothes, // Assuming donation contains clothes count
              donationFoodDescription: donationData.foodDescription, // Assuming donation contains food description
            };
          })
        );

        setRequests(requestList); // Set the requests with the donations included
      } catch (err) {
        setError("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests(); // Fetch donations and related requests
  }, []);

  // Confirm donation as fulfilled
  const handleConfirmDonation = async (donationId, requestId) => {
    try {
      // Update the donation status to "Confirmed"
      const donationRef = doc(firestore, "donations", donationId);
      await updateDoc(donationRef, { confirmed: true });

      // Optionally, update the request status as well
      const requestRef = doc(firestore, "requests", requestId);
      await updateDoc(requestRef, { status: "Fulfilled" });

      // Update the UI state with the confirmed donation
      setRequests((prevRequests) =>
        prevRequests.map((request) => {
          if (request.donationId === donationId) {
            return {
              ...request,
              donationStatus: "Confirmed",
            };
          }
          return request;
        })
      );
    } catch (err) {
      setError("Failed to confirm donation: " + err.message);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6 mt-10">Fulfilled Requests</h2>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {requests.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No fulfilled requests yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.donationId} className="bg-gray-100 p-4 rounded-lg shadow-md">
                  <h2 className="text-lg font-bold">{request.title}</h2>
                  <p className="text-gray-700">{request.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Request ID:</strong> {request.id}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>
                    <span
                      className={`px-2 py-1 rounded-md ${
                        request.donationStatus === "Pending" ? "bg-yellow-400" : "bg-green-500"
                      } text-white`}
                    >
                      {request.donationStatus}
                    </span>
                  </p>

                  {/* Donations List */}
                  {request.donationType && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-sm">Donation:</h3>
                      <ul>
                        <li className="text-sm text-gray-700">
                          Donation Type: {request.donationType} - Amount: {request.donationAmount || 'N/A'}
                        </li>
                        {/* Display donation details based on type */}
                        {request.donationType === "Clothes" && request.donationClothesCount && (
                          <li className="text-sm text-gray-700">
                            Number of Clothes: {request.donationClothesCount}
                          </li>
                        )}
                        {request.donationType === "Food" && request.donationFoodDescription && (
                          <li className="text-sm text-gray-700">
                            Food Description: {request.donationFoodDescription}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Confirm Donation Button */}
                  {request.donationStatus === "Pending" && (
                    <button
                      onClick={() => handleConfirmDonation(request.donationId, request.id)}
                      className="bg-blue-500 text-white py-2 px-4 rounded-md mt-4"
                    >
                      Confirm Donation
                    </button>
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

export default ConfirmedRequests;
