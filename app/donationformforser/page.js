"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function DonateServiceForm() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
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

    fetchServices(); // Fetch services on component mount
  }, []);

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

    if (!selectedService || !serviceDescription) {
      setError("Please select a service and provide a description.");
      setLoading(false);
      return;
    }

    try {
      // Store the service donation information in Firestore
      await addDoc(collection(firestore, "donations"), {
        donorId: user.uid,
        donorEmail: user.email,
        service: selectedService,
        serviceDescription,
        confirmed: false, // Initially set to false. Service can be confirmed later.
        timestamp: new Date(),
      });

      router.push("/donorDashboard");
    } catch (err) {
      setError("Failed to submit service donation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start mt-20 min-h-screen">
      <div className="max-w-lg w-full p-6 bg-white rounded-md shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Donate a Service</h2>
        
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="selectedService">Select Service</Label>
            <select
              id="selectedService"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-black bg-white border-gray-300"
              required
            >
              <option value="">-- Select a Service --</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}  {/* Change from 'name' to 'title' */}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="serviceDescription">Service Description</Label>
            <Textarea
              id="serviceDescription"
              placeholder="Describe the service you are donating"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Submitting Donation..." : "Submit Service Donation"}
          </button>
        </form>
      </div>
    </div>
  );
}
