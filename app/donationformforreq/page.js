"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function DonateForm() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState("");
  const [donationType, setDonationType] = useState("");
  const [amount, setAmount] = useState("");
  const [numClothes, setNumClothes] = useState("");
  const [foodDescription, setFoodDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orphanageId, setOrphanageId] = useState(null); // To store orphanageId from the selected request
  const [requestType, setRequestType] = useState(""); // Store request type for comparison
  const router = useRouter();

  useEffect(() => {
    async function fetchRequests() {
      try {
        const requestSnapshot = await getDocs(collection(firestore, "requests"));
        const fetchedRequests = requestSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(fetchedRequests);
        console.log("Fetched Requests:", fetchedRequests);
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to fetch requests");
      }
    }

    fetchRequests(); // Fetch requests only
  }, []);

  // Function to handle the change of the selected request
  const handleRequestChange = async (e) => {
    const requestId = e.target.value;
    setSelectedRequest(requestId);

    // Reset the request type if no valid request is selected
    setRequestType(""); 

    if (requestId) {
      const requestDocRef = doc(firestore, "requests", requestId);
      const requestDocSnap = await getDoc(requestDocRef);
      if (requestDocSnap.exists()) {
        const requestData = requestDocSnap.data();
        setOrphanageId(requestData.orphanageId);  // Store orphanageId from request data
        setRequestType(requestData.requestType);  // Store requestType for validation
      } else {
        setError("Request not found.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to donate.");
      setLoading(false);
      return;
    }

    // Ensure the requestType and donationType match
    if (donationType !== requestType) {
      setError(`You cannot donate ${donationType} for a ${requestType} request.`);
      setLoading(false);
      return;
    }

    if (!selectedRequest || !donationType || !orphanageId) {
      setError("Please select both a request and donation type.");
      setLoading(false);
      return;
    }

    try {
      // Add donation document to the "donations" collection
      const donationRef = await addDoc(collection(firestore, "donations"), {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId,
        requestId: selectedRequest,
        donationType,
        amount: donationType === "Money" ? amount : null,
        numClothes: donationType === "Clothes" ? numClothes : null,
        foodDescription: donationType === "Food" ? foodDescription : null,
        confirmed: false,
        timestamp: new Date(),
      });

      // Update the request document to include the new donation ID
      const requestRef = doc(firestore, "requests", selectedRequest);
      await updateDoc(requestRef, {
        donations: arrayUnion(donationRef.id),  // Add the new donation ID to the donations array
      });

      router.push("/donorDashboard");
    } catch (err) {
      setError("Failed to submit donation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start mt-20 min-h-screen">
      <div className="max-w-lg w-full p-6 bg-white rounded-md shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Make a Donation</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="request">Select Request</Label>
            <select
              id="request"
              value={selectedRequest}
              onChange={handleRequestChange}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">-- Select a Request --</option>
              {requests.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || item.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="donationType">Donation Type</Label>
            <select
              id="donationType"
              value={donationType}
              onChange={(e) => setDonationType(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">-- Select Donation Type --</option>
              <option value="Money">Money</option>
              <option value="Clothes">Clothes</option>
              <option value="Food">Food</option>
            </select>
          </div>

          {/* Conditional fields */}
          {donationType === "Money" && (
            <div>
              <Label htmlFor="amount">Amount (in $)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          )}

          {donationType === "Clothes" && (
            <div>
              <Label htmlFor="numClothes">Number of Clothes</Label>
              <Input
                id="numClothes"
                type="number"
                placeholder="Enter number of clothes"
                value={numClothes}
                onChange={(e) => setNumClothes(e.target.value)}
                required
              />
            </div>
          )}

          {donationType === "Food" && (
            <div>
              <Label htmlFor="foodDescription">Food Description</Label>
              <Textarea
                id="foodDescription"
                placeholder="Describe the food items you are donating"
                value={foodDescription}
                onChange={(e) => setFoodDescription(e.target.value)}
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-green-500 text-white hover:bg-green-600"
            disabled={loading}
          >
            {loading ? "Submitting Donation..." : "Submit Donation"}
          </Button>
        </form>
      </div>
    </div>
  );
}