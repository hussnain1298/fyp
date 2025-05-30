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
  onSnapshot,
  orderBy,
  setDoc,
} from "firebase/firestore";
import ChatModal from "../chat/chatmodal";
import { FaUtensils, FaTshirt, FaMoneyBillWave } from "react-icons/fa";

export default function RequestsHoverDemo() {
  const [cityFilteredRequests, setCityFilteredRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [city, setCity] = useState("Detecting...");
  const [userCityFilter, setUserCityFilter] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const effectiveCity = userCityFilter.trim() || city.trim();

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [orphanageId, setOrphanageId] = useState(null);
  const [orphanageName, setOrphanageName] = useState(null);
  const [donorId, setDonorId] = useState(null);
  const [donorName, setDonorName] = useState(null);
  const [profilesCache, setProfilesCache] = useState({});

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async ({ coords }) => {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`);
      const data = await res.json();
      setCity(data.city || data.locality || data.principalSubdivision || "Unknown");
    });
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const orphanSnap = await getDocs(query(collection(firestore, "users"), where("userType", "==", "Orphanage")));
      const normalizedCity = effectiveCity.toLowerCase();

      const orphanMap = {};
      orphanSnap.forEach((doc) => {
        const data = doc.data();
        const cityMatch = (data.city || "").trim().toLowerCase();
        if (!normalizedCity || ["detecting...", "unknown"].includes(normalizedCity) || cityMatch === normalizedCity) {
          orphanMap[doc.id] = data;
        }
      });

      const reqSnap = await getDocs(collection(firestore, "requests"));
      const requests = reqSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((r) => orphanMap[r.orphanageId])
        .map((r) => ({ ...r, orphanInfo: orphanMap[r.orphanageId] }));

      setCityFilteredRequests(requests);
      setLoading(false);
    };
    fetchRequests();
  }, [effectiveCity]);

  useEffect(() => {
    const start = (page - 1) * pageSize;
    const filtered = selectedType === "All"
      ? cityFilteredRequests
      : cityFilteredRequests.filter(r => r.requestType.toLowerCase() === selectedType.toLowerCase());
    setFilteredRequests(filtered.slice(start, start + pageSize));
  }, [selectedType, cityFilteredRequests, page]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;
      const snap = await getDoc(doc(firestore, "users", u.uid));
      const data = snap.exists() ? snap.data() : {};
      setUserType(data.userType || null);
      setDonorId(data.userType === "Donor" ? u.uid : null);
    });
    return unsubscribe;
  }, []);

  const handleChat = async (req) => {
    if (!user || userType !== "Donor") return alert("Please login as a donor to chat.");
    const chatsRef = collection(firestore, "chats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid), where("requestId", "==", req.id));
    const snapshot = await getDocs(q);

    let chat = snapshot.docs.find((d) => d.data().participants.includes(req.orphanageId));
    let id = chat?.id;

    if (!id) {
      const newChat = await addDoc(chatsRef, {
        participants: [user.uid, req.orphanageId],
        requestId: req.id,
        orphanageId: req.orphanageId,
        donorId: user.uid,
        createdAt: serverTimestamp(),
      });
      id = newChat.id;
    }

    setChatId(id);
    setOrphanageId(req.orphanageId);
    setChatModalOpen(true);

    const unsub = onSnapshot(
      query(collection(firestore, "chats", id, "messages"), orderBy("timestamp", "asc")),
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        const senderIds = [...new Set(msgs.map((m) => m.senderId))];
        senderIds.forEach(async (sid) => {
          if (!profilesCache[sid]) {
            const userDoc = await getDoc(doc(firestore, "users", sid));
            setProfilesCache(prev => ({
              ...prev,
              [sid]: userDoc.exists() ? userDoc.data() : null
            }));
          }
        });
      }
    );
    return () => unsub();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await addDoc(collection(firestore, "chats", chatId, "messages"), {
      senderId: user.uid,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });

    if (userType === "Donor" && orphanageId) {
      const notifRef = doc(firestore, "notifications", orphanageId, "userNotifications", chatId);
      await setDoc(notifRef, {
        chatId,
        donorId: user.uid,
        lastMessage: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false,
      });
    }

    setNewMessage("");
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    setMessages([]);
    setChatId(null);
    setNewMessage("");
  };

  const typeIcon = (type) => {
    const iconMap = {
      Food: <FaUtensils className="text-orange-500" />,
      Money: <FaMoneyBillWave className="text-green-500" />,
      Clothes: <FaTshirt className="text-blue-500" />,
      Other: <span className="text-purple-500 font-bold">•</span>,
    };
    return type in iconMap ? iconMap[type] : iconMap.Other;
  };

  const totalPages = Math.ceil(
    (selectedType === "All"
      ? cityFilteredRequests.length
      : cityFilteredRequests.filter(r => r.requestType.toLowerCase() === selectedType.toLowerCase()).length
    ) / pageSize
  );

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="bg-green-100 text-green-700 font-medium px-4 py-2 rounded shadow">
            📍 Showing requests near <strong>{effectiveCity}</strong>
          </p>
          <input
            type="text"
            value={userCityFilter}
            onChange={(e) => setUserCityFilter(e.target.value)}
            placeholder="Filter by city"
            className="border-b border-gray-300 focus:outline-none focus:border-green-600 px-2 py-1"
          />
        </div>

        <div className="flex gap-4 mb-6">
          {"All,Food,Money,Clothes".split(",").map(type => (
            <button
              key={type}
              onClick={() => { setSelectedType(type); setPage(1); }}
              className={`px-4 py-2 rounded border ${
                selectedType === type ? "bg-green-600 text-white" : "border-gray-300"
              }`}
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
              <div key={req.id} className="p-5 border rounded-lg shadow bg-white">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">
                    {req.requestType === "Other" && req.quantity ? req.quantity : req.requestType}
                  </h3>
                  <span className={`inline-block px-2 py-1 rounded text-white text-xs ${
                    req.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
                  }`}>
                    {req.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{req.description}</p>
                
                <p className="text-sm text-gray-500">
                  Orphanage: {req.orphanInfo?.orgName || "N/A"}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Location: {req.orphanInfo?.city || "N/A"}
                </p>
                <button
                  onClick={() => handleChat(req)}
                  className="bg-green-500 hover:bg-green-600 text-white py-1 px-4 rounded"
                >
                  Chat Now
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-8 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1 ? "bg-green-600 text-white" : "bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {chatModalOpen && (
        <ChatModal
          messages={messages}
          user={user}
          orphanageId={orphanageId}
          orphanageName={orphanageName}
          donorName={donorName}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={sendMessage}
          closeChatModal={closeChatModal}
          profilesCache={profilesCache}
        />
      )}
    </>
  );
}
