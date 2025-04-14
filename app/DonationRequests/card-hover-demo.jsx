"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // ✅ Router for navigation
import { auth, firestore } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getDoc, doc } from "firebase/firestore"; // ✅ Fix: Import getDoc
export default function RequestsHoverDemo() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState(null); // ✅ Track user role
  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, "requests"));
        const requestList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          description: doc.data().description,
          status: doc.data().status || "Pending",
          orphanageId: doc.data().orphanageId || "",
          orphanageEmail: doc.data().orphanageEmail || "",
        }));

        setRequests(requestList);
      } catch (err) {
        setError("Failed to load requests: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUserRole(null); // ✅ User not logged in
        return;
      }

      // 🔹 Fetch user role from Firestore
      const userDoc = await getDocs(collection(firestore, "users"));
      userDoc.forEach((doc) => {
        if (doc.id === currentUser.uid) {
          setUserRole(doc.data().userType); // ✅ Set user role
        }
      });
    };

    fetchRequests();
    checkUserRole();
  }, []);

  // ✅ Handle "Donate" button click
  const handleDonate = (request) => {
    const user = auth.currentUser;
    if (!user) {
      // Redirect to login if user is not logged in
      router.push("/login?redirect=donate");
      return;
    }
  
    // ✅ Fetch user role from Firestore
    const userRef = doc(firestore, "users", user.uid);
    getDoc(userRef).then((userDoc) => {
      if (userDoc.exists() && userDoc.data().userType === "Donor") {
        // ✅ Redirect to chat only if user is a donor
        router.push(`/chat?title=${encodeURIComponent(request.title)}&description=${encodeURIComponent(request.description)}&orphanageId=${request.orphanageId}&requestId=${request.id}&orphanageEmail=${request.orphanageEmail}`);
      } else {
        alert("❌ Only donors can donate!");
      }
    }).catch((error) => {
      console.error("🔥 Error fetching user role:", error);
    });
  };
  

  return (
    <div className="max-w-5xl mx-auto px-8">
      {error && <p className="text-red-500 text-center">{error}</p>}
      {loading && <p className="text-gray-500 text-center">Loading...</p>}

      {!loading && requests.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div key={request.id} className="p-4 border rounded-lg shadow-md bg-white">
              <h3 className="text-lg font-semibold">{request.title}</h3>
              <p className="text-gray-600">{request.description}</p>

              <button
                onClick={() => handleDonate(request)}
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded-md w-full"
              >
                Donate
              </button>
            </div>
          ))}
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500">No requests available.</p>
      )}
    </div>
  );
}
