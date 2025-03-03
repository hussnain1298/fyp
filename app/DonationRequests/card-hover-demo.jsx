"use client";

import { useState, useEffect } from "react";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { firestore } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function RequestsHoverDemo() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch Requests from Firestore
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, "requests"));
        const requestList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          description: doc.data().description,
          status: doc.data().status, // Get status from Firestore
        }));

        setRequests(requestList);
      } catch (err) {
        setError("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-8">
      {/* Error Message */}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Loading State */}
      {loading && <p className="text-gray-500 text-center">Loading...</p>}

      {/* Requests List with Hover Effect */}
      {!loading && requests.length > 0 ? (
        <HoverEffect
          items={requests.map((request) => ({
            title: request.title,
            description: request.description, // Only display title and description
            link: `/request/${request.id}`, // Dynamic link for request details
            status: request.status, // Optionally pass status for display
          }))}
        />
      ) : (
        !loading && (
          <p className="text-center text-gray-500">No requests available.</p>
        )
      )}
    </div>
  );
}
