"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "users"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    });

    return () => unsub();
  }, []);

  const filteredUsers = users.filter((user) =>
    filter === "All" ? true : user.userType === filter
  );

  return (
    <div>
     <h2 className="text-4xl font-bold text-gray-800 mb-6 border-b pb-2 mt-10 text-center">
    Registered Users
        </h2>

      {/* Filter Dropdown */}
      <div className="mb-4" >
        <label className="mr-2 text-sm font-medium">Filter by Type:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="All">All</option>
          <option value="Donor">Donors</option>
          <option value="Orphanage">Orphanages</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">City</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
             <td className="p-2 border">
  {user.userType === "Orphanage"
    ? user.orgName || "N/A"
    : user.fullName || "N/A"}
</td>


                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.userType}</td>
                <td className="p-2 border">{user.city || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No users found.</p>
        )}
      </div>
    </div>
  );
}
