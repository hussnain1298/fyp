"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import ServiceFulfillModal from "../servicefulfillmodal";

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("userSession");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    async function fetchService() {
      setLoading(true);
      try {
        const docRef = doc(firestore, "services", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError("Service not found.");
          setLoading(false);
          return;
        }
        const serviceData = { id: docSnap.id, ...docSnap.data() };

        // Fetch orphanage info using orphanageId
        if (serviceData.orphanageId) {
          const orphanRef = doc(firestore, "users", serviceData.orphanageId);
          const orphanSnap = await getDoc(orphanRef);
          if (orphanSnap.exists()) {
            serviceData.orphanInfo = orphanSnap.data();
          } else {
            serviceData.orphanInfo = null;
          }
        }

        setService(serviceData);
      } catch (error) {
        setError("Failed to load service.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchService();
  }, [id]);

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-10 relative">
      <h1 className="text-4xl font-bold mb-6 text-green-900">{service.title}</h1>
      <p className="mb-6 text-lg text-green-800">{service.description}</p>

      <div className="mb-6 text-green-700 space-y-2">
        <p>
          <span className="font-semibold">Orphanage:</span> {service.orphanInfo?.orgName || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Location:</span> {service.orphanInfo?.city || "N/A"}
        </p>
        <p>
          <span className="font-semibold">Status:</span>{" "}
          <span
            className={`inline-block px-3 py-1 rounded-full text-white ${
              service.status === "Pending" ? "bg-yellow-500" : "bg-green-600"
            }`}
          >
            {service.status}
          </span>
        </p>
      </div>

      <ServiceFulfillModal service={service} user={user} />
    </main>
  );
}
