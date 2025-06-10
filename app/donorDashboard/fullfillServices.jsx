'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const FulfillServices = () => {
  const [services, setServices] = useState([]); // Store services
  const [loading, setLoading] = useState(true);  // Loading state
  const [error, setError] = useState("");  // Error state
  const router = useRouter();

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view services.");
        setLoading(false);
        return;
      }

      try {
        // Query to fetch all services from Firestore
        const serviceSnapshot = await getDocs(collection(firestore, "services"));

        if (serviceSnapshot.empty) {
          setError("No services found.");
          setLoading(false);
          return;
        }

        // Extract services from snapshot
        const serviceList = serviceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),  // Get the data of each document
        }));

        setServices(serviceList);  // Store services in state
      } catch (err) {
        setError("Failed to load services: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();  // Fetch services when the component mounts
  }, []);

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold text-gray-800 text-center pb-6">
            Services
          </h2>

          {/* ✅ Add a Request Button */}
          <button
            type="button"
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md mt-12"
            onClick={() => router.push("/donationformforser")}
          >
            Provide a Service
          </button>
        </div>

        {/* 🔹 Error Message */}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}

        {/* 🔹 Loading State */}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        {/* 🔹 Services List */}
        <div className="mt-6">
          {services.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No services yet.</p>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="bg-gray-100 p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-800">{service.title}</h3>
                  <p className="text-gray-700">{service.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Service ID:</strong> {service.id}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-md ${
                        service.status === "Pending"
                          ? "bg-yellow-400"
                          : "bg-green-500"
                      } text-white`}
                    >
                      {service.status}
                    </span>
                  </p>

                  <div className="flex space-x-4 mt-4">
                    {/* Buttons for edit, delete, and other actions */}
                    <button
                      onClick={() => console.log(`Edit service: ${service.id}`)} // Placeholder for edit action
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => console.log(`Delete service: ${service.id}`)} // Placeholder for delete action
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
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

export default FulfillServices;
