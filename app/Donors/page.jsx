"use client";

import { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Navbar from "../Navbar/navbar";
import Footer from "../footer/page";

const generateColor = (name) => {
  if (!name) return "#4CAF50";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const val = (hash >> (i * 8)) & 0xff;
    color += ("00" + val.toString(16)).slice(-2);
  }
  return color;
};

const getInitial = (name) => {
  if (!name) return "A";
  return name.charAt(0).toUpperCase();
};

export default function OurDonors() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [orphanageId, setOrphanageId] = useState(null);
  const pageSize = 6;
  const router = useRouter();

  // Get current user (assumed to be an orphanage)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setOrphanageId(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchDonors = async () => {
      try {
        const q = query(
          collection(firestore, "users"),
          where("userType", "==", "Donor")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (donor) =>
              donor.orgName &&
              donor.orgName.trim() !== "" &&
              donor.contactNumber &&
              donor.contactNumber.trim() !== ""
          )
          .sort((a, b) =>
            a.orgName.toLowerCase().localeCompare(b.orgName.toLowerCase())
          );
        setDonors(data);
      } catch (error) {
        console.error("Error fetching donors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonors();
  }, []);

  const totalPages = Math.ceil(donors.length / pageSize);
  const paginatedDonors = donors.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold text-center mb-12 mt-20 text-gray-800">
          OUR DONORS
        </h1>

        {loading ? (
          <p className="text-center text-gray-500 text-lg">Loading donors...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {paginatedDonors.map((donor) => (
                <div
                  key={donor.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col"
                  onClick={() => router.push(`/donor/${donor.id}`)}
                >
                  <div className="flex items-center px-6 py-5 border-b border-gray-200">
                    {donor.profilePhoto ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={donor.profilePhoto}
                          alt={donor.orgName || "Donor"}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-semibold flex-shrink-0"
                        style={{ backgroundColor: generateColor(donor.orgName) }}
                      >
                        {getInitial(donor.orgName)}
                      </div>
                    )}

                    <div className="ml-5 flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 truncate">
                        {donor.orgName || "Anonymous Donor"}
                      </h2>
                      <p className="text-gray-600 text-sm mt-1 truncate">
                        {donor.orgAddress || "No address provided"}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {donor.city || "City not set"}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Contact: {donor.contactNumber || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (orphanageId) {
                        router.push(
                          `/chat?chatId=auto&donorId=${donor.id}&orphanageId=${orphanageId}`
                        );
                      } else {
                        alert("Please log in as an orphanage to start a chat.");
                      }
                    }}
                    className="mt-auto w-full py-3 rounded-b-xl font-semibold text-white bg-gradient-to-r from-green-400 to-blue-500 shadow-md hover:from-blue-500 hover:to-green-400 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                  >
                    Chat
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-10 space-x-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Prev
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setPage(idx + 1)}
                    className={`px-4 py-2 rounded ${
                      page === idx + 1
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
