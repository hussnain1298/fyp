"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  if (!name) return "O";
  return name.charAt(0).toUpperCase();
};

export default function OurOrphanages() {
  const [orphanages, setOrphanages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const router = useRouter();

  useEffect(() => {
    const fetchOrphanages = async () => {
      try {
        const q = query(
          collection(firestore, "users"),
          where("userType", "==", "Orphanage")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrphanages(data);
      } catch (error) {
        console.error("Error fetching orphanages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrphanages();
  }, []);

  const totalPages = Math.ceil(orphanages.length / pageSize);
  const paginatedOrphanages = orphanages.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold text-center mb-12 mt-20 text-gray-800">
        OUR ORPHANAGES 
      </h1>

      {loading ? (
        <p className="text-center text-gray-500 text-lg">Loading orphanages...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {paginatedOrphanages.map((orp) => (
              <div
                key={orp.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col"
                onClick={() => router.push(`/chat?chatId=auto&orphanageId=${orp.id}`)}
              >
                <div className="flex items-center px-6 py-5 border-b border-gray-200">
                  {orp.profilePhoto ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={orp.profilePhoto}
                        alt={orp.orgName || "Orphanage"}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-semibold flex-shrink-0"
                      style={{ backgroundColor: generateColor(orp.orgName) }}
                    >
                      {getInitial(orp.orgName)}
                    </div>
                  )}
                  <div className="ml-5 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 truncate">
                      {orp.orgName || "Unnamed Orphanage"}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1 truncate">
                      {orp.orgAddress || "No address provided"}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {orp.city || "City not set"}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Contact: {orp.contactNumber || "Not provided"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/chat?chatId=auto&orphanageId=${orp.id}`);
                  }}
                  className="mt-auto w-full py-3 rounded-b-xl font-semibold text-white bg-gradient-to-r from-green-400 to-blue-500 shadow-md hover:from-blue-500 hover:to-green-400 transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                >
                  Message
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-12 space-x-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                Prev
              </button>
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-4 py-2 rounded ${
                      page === pageNum
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
