"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";

export default function RequestsHoverDemo() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState(null);
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
        setUserRole(null);
        return;
      }

      try {
        const userRef = doc(firestore, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().userType);
        }
      } catch (err) {
        console.error("Error checking user role:", err.message);
        setUserRole(null);
      }
    };

    fetchRequests();
    checkUserRole();
  }, []);

  const handleDonate = async (request) => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/login?redirect=donate");
      return;
    }

    if (!request.orphanageId) {
      alert("Invalid request. Orphanage not found.");
      return;
    }

    const userRef = doc(firestore, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || userDoc.data().userType !== "Donor") {
      alert("❌ Only donors can donate!");
      return;
    }

    const chatsRef = collection(firestore, "chats");

    const q = query(
      chatsRef,
      where("participants", "array-contains", user.uid),
      where("requestId", "==", request.id)
    );

    const querySnapshot = await getDocs(q);

    let chatDoc = null;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.participants.includes(request.orphanageId)) {
        chatDoc = doc;
      }
    });

    if (chatDoc) {
      router.push(`/chat?chatId=${chatDoc.id}`);
    } else {
      const newChat = await addDoc(chatsRef, {
        participants: [user.uid, request.orphanageId],
        requestId: request.id,
        createdAt: serverTimestamp(),
      });
      router.push(`/chat?chatId=${newChat.id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-8">
      {error && <p className="text-red-500 text-center">{error}</p>}
      {loading && <p className="text-gray-500 text-center">Loading...</p>}

      {!loading && requests.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 border rounded-lg shadow-md bg-white"
            >
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
        !loading && (
          <p className="text-center text-gray-500">No requests available.</p>
        )
      )}
    </div>
  );
}
