"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DonateForm() {
  const [requests, setRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState("");
  const [donationType, setDonationType] = useState("");
  const [amount, setAmount] = useState("");
  const [numClothes, setNumClothes] = useState("");
  const [foodDescription, setFoodDescription] = useState("");
  const [service, setService] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orphanageId, setOrphanageId] = useState(null);  // To store orphanageId from the selected request
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

    async function fetchServices() {
      try {
        const serviceSnapshot = await getDocs(collection(firestore, "services"));
        const fetchedServices = serviceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(fetchedServices);
        console.log("Fetched Services:", fetchedServices);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("Failed to fetch services");
      }
    }

    fetchRequests();
    fetchServices(); // Fetch services as well
  }, []);

  const handleRequestChange = async (e) => {
    const requestId = e.target.value;
    setSelectedRequest(requestId);
  
    // Fetch the orphanageId for the selected request
    if (requestId) {
      const requestDocRef = doc(firestore, "requests", requestId);
      const requestDocSnap = await getDoc(requestDocRef);  // Use getDoc instead of getDocs
      if (requestDocSnap.exists()) {
        const requestData = requestDocSnap.data();
        setOrphanageId(requestData.orphanageId);  // Store orphanageId from request data
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

    if (!selectedRequest || !donationType || !orphanageId) {
      setError("Please select both a request and donation type.");
      setLoading(false);
      return;
    }

    try {
      // Store the donation information in Firestore
      await addDoc(collection(firestore, "donations"), {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId,  // Store the orphanageId from the selected request
        requestId: selectedRequest,
        donationType,
        amount: donationType === "money" ? amount : null,
        numClothes: donationType === "clothes" ? numClothes : null,
        foodDescription: donationType === "food" ? foodDescription : null,
        service: donationType === "services" ? service : null,
        serviceDescription: donationType === "services" ? serviceDescription : null,
        confirmed: false,  // Initially set to false. Orphanage can confirm later.
        timestamp: new Date(),
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
              <option value="">-- Select a Request or Service --</option>
              {/* Displaying both requests and services */}
              {[...requests, ...services].map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || item.description || item.name} {/* Adjust field name */}
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
              <option value="money">Money</option>
              <option value="clothes">Clothes</option>
              <option value="food">Food</option>
              <option value="services">Services</option>
            </select>
          </div>

          {/* Conditional fields */}
          {donationType === "money" && (
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

          {donationType === "clothes" && (
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

          {donationType === "food" && (
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

          {donationType === "services" && (
            <>
              <div>
                <Label htmlFor="service">Service Type</Label>
                <Input
                  id="service"
                  type="text"
                  placeholder="Enter service (e.g., Tutoring, Medical Help)"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="serviceDescription">Service Description (Optional)</Label>
                <Textarea
                  id="serviceDescription"
                  placeholder="Optional description of your service"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            disabled={loading}
          >
            {loading ? "Submitting Donation..." : "Submit Donation"}
          </button>
        </form>
      </div>
    </div>
  );
}