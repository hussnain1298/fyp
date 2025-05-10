"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";

const FulfillRequests = () => {
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
        // Query donations collection where the donorId matches the current user's UID
        const q = query(
          collection(firestore, "donations"),
          where("donorId", "==", user.uid) // Fetch donations related to this user (donor)
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

  // Example for the delete operation
  const handleDelete = async (donationId, requestId) => {
    console.log("Attempting to delete donation:", donationId, "from request:", requestId);  // Debugging output
    try {
      // Delete the donation document
      await deleteDoc(doc(firestore, "donations", donationId));
  
      // Update the request to remove this donation reference
      const requestRef = doc(firestore, "requests", requestId);
      await updateDoc(requestRef, {
        donations: arrayRemove(donationId),
      });
  
      setRequests(requests.filter(request => request.donationId !== donationId)); // Remove from local state
    } catch (err) {
      console.error("Error deleting donation:", err);  // Log the error
      setError("Failed to delete donation: " + err.message);
    }
  };

  const handleEdit = async (donationId, requestId, newAmount) => {
    try {
      // Check if newAmount is a valid number
      if (isNaN(newAmount) || newAmount <= 0) {
        setError("Please enter a valid donation amount.");
        return;
      }
  
      // Update the donation document
      const donationRef = doc(firestore, "donations", donationId);
      await updateDoc(donationRef, {
        amount: newAmount, // Update the donation amount
      });
  
      // Update the corresponding request if necessary
      // For now, we assume the request does not need to be updated
  
      // Update local state with the new donation amount
      setRequests(prevRequests =>
        prevRequests.map(request => {
          if (request.donationId === donationId) {
            return { ...request, donationAmount: newAmount }; // Update donation amount in local state
          }
          return request;
        })
      );
      
      // Optional: You can also add some feedback here to notify the user of success
  
    } catch (err) {
      console.error("Error editing donation:", err);  // Log the error
      setError("Failed to edit donation: " + err.message);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-8">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6 mt-10">FUlFILL A REQUEST</h2>

        {/* Donate Now Button */}
        <div className="text-center mb-6">
          <button
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md"
            onClick={() => router.push("/donationformforreq")}
          >
            Donate Now
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {requests.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No fulfill requests yet.</p>
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

                  <div className="flex space-x-4 mt-4">
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-400"
                      onClick={() => handleEdit(request.donationId, request.id, 100)} // Example edit, change amount to 100
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                      onClick={() => handleDelete(request.donationId, request.id)} // Delete the donation
                    >
                      Delete
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

export default FulfillRequests;
