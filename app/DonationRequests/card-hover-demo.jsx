"use client";

import { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FaUtensils, FaTshirt, FaMoneyBillWave } from "react-icons/fa";

export default function RequestsHoverDemo() {
  const [requests, setRequests] = useState([]);
  const [city, setCity] = useState("Detecting...");
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");
  const router = useRouter();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await res.json();
        setCity(data.city || data.locality || data.principalSubdivision || "Unknown");
      } catch {
        setCity("Unknown");
      }
    });
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      if (city === "Detecting..." || city === "Unknown") return;
      try {
        const orphanQuery = query(
          collection(firestore, "users"),
          where("userType", "==", "Orphanage"),
          where("city", "==", city)
        );
        const orphanSnapshot = await getDocs(orphanQuery);
        const orphanMap = {};
        orphanSnapshot.docs.forEach(doc => {
          orphanMap[doc.id] = doc.data();
        });

        const reqSnap = await getDocs(collection(firestore, "requests"));
        const filtered = reqSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(req => orphanMap[req.orphanageId]);

        setRequests(filtered.map(req => ({
          ...req,
          orphanInfo: orphanMap[req.orphanageId]
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [city]);

  const handleChat = async (req) => {
    const user = auth.currentUser;
    if (!user) return router.push("/login?redirect=donate");

    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data().userType !== "Donor") {
      return alert("Only donors can chat.");
    }

    const chatsRef = collection(firestore, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", user.uid),
      where("requestId", "==", req.id)
    );

    const snapshot = await getDocs(q);
    let chatId = null;
    snapshot.forEach(doc => {
      if (doc.data().participants.includes(req.orphanageId)) {
        chatId = doc.id;
      }
    });

    if (!chatId) {
      const chatDoc = await addDoc(chatsRef, {
        participants: [user.uid, req.orphanageId],
        requestId: req.id,
        createdAt: serverTimestamp()
      });
      chatId = chatDoc.id;
    }

    router.push(`/chat?chatId=${chatId}`);
  };

  const filteredRequests = selectedType === "All"
    ? requests
    : requests.filter((r) => r.requestType === selectedType);

  const typeIcon = (type) => {
    switch (type) {
      case "Food":
        return <FaUtensils className="inline mr-1 text-orange-500" />;
      case "Money":
        return <FaMoneyBillWave className="inline mr-1 text-green-500" />;
      case "Clothes":
        return <FaTshirt className="inline mr-1 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-7xl">
        <div className="flex justify-end mb-6">
          <p className="text-lg font-medium text-green-700 bg-green-100 px-4 py-2 rounded-md shadow-sm">
            📍 Showing requests near <span className="font-semibold">{city}</span>
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          {["All", "Food", "Money", "Clothes"].map(type => (
            <button
              key={type}
              className={`px-4 py-2 border rounded-md text-sm ${
                selectedType === type
                  ? "bg-green-600 text-white"
                  : "border-gray-300 text-gray-700"
              }`}
              onClick={() => setSelectedType(type)}
            >
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="text-center text-gray-400">No requests found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 border rounded-lg shadow bg-white flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-1">{req.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{req.description}</p>

                  <div className="flex items-center gap-2 text-sm mb-1">
                    <span className="font-medium text-gray-600">Type:</span>
                    <span className="flex items-center text-gray-800">
                      {typeIcon(req.requestType)} {req.requestType}
                    </span>
                  </div>

                  {req.orphanInfo && (
                    <>
                      <p className="text-sm text-gray-500">
                        <strong>Orphanage:</strong> {req.orphanInfo.orgName || "N/A"}
                      </p>
                      <p className="text-sm text-gray-500">
                        <strong>Location:</strong> {req.orphanInfo.city || "N/A"}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => handleChat(req)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Chat Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
