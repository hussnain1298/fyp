"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import dayjs from "dayjs";

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "subscriptions"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubscriptions(data);
    });

    return () => unsub();
  }, []);

  return (
    <div>
      <h2 className="text-4xl font-bold text-gray-800 mb-6 border-b pb-2 mt-10 text-center">
      Email Subscriptions
        </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td className="p-2 border">{sub.email}</td>
                <td className="p-2 border">
                  {sub.timestamp ? dayjs(sub.timestamp.toDate()).format("M/D/YYYY, h:mm A") : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
