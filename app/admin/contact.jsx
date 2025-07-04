"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export default function Contact() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, "contact-us"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMessages(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching contact submissions:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
     
      <h2 className="text-4xl font-bold text-gray-800 mb-6 border-b pb-2 mt-10 text-center">
      Contact Form Submissions
        </h2>

      {loading ? (
        <p>Loading...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">No messages received yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Message</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(({ id, name, email, message, timestamp }) => (
                <tr key={id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{name}</td>
                  <td className="p-3 text-blue-600">{email}</td>
                  <td className="p-3 max-w-sm truncate" title={message}>{message}</td>
                  <td className="p-3 text-gray-500">
                    {timestamp?.toDate?.().toLocaleString?.() || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
