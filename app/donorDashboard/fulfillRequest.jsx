'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

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
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(firestore, "requests"));
        const querySnapshot = await getDocs(q);

        const requestList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8 mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold text-gray-800 text-center pb-6">
            Requests
          </h2>

          <button
            type="button"
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md mt-12"
            onClick={() => router.push("/donationformforreq")}
          >
            FulFill a Request
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {requests.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No requests yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-100 p-6 rounded-lg shadow-md"
                >
                  <h3 className="text-lg font-bold">{request.title}</h3>
                  <p className="text-gray-700">{request.description}</p>

                  <p className="mt-2 text-sm text-gray-600">
                    <strong>Quantity Requested:</strong> {request.quantity}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    <strong>Total Donated:</strong>{" "}
                    {Array.isArray(request.totalDonated)
                      ? request.totalDonated.reduce((acc, val) => parseInt(acc) + parseInt(val), 0)
                      : Number(request.totalDonated) || 0}
                  </p>

                  <p className="mt-2 text-sm">
                    <strong>Request ID:</strong> {request.id}
                  </p>

                  <div className="flex space-x-4 mt-4">
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-400"
                      onClick={() =>
                        router.push(
                          `/chat?requestId=${request.id}&userEmail=${auth.currentUser?.email}`
                        )
                      }
                    >
                      View Chat
                    </button>

                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                      onClick={() => console.log("Edit Request", request.id)}
                    >
                      Edit
                    </button>

                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                      onClick={() => console.log("Delete Request", request.id)}
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
