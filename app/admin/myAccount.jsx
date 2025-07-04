"use client";

export default function MyAccount({ admin }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <h3 className="text-xl font-bold mb-4">Account Overview</h3>
      <p><strong>Name:</strong> {admin ? "Admin User" : "Donor User"}</p>
      <p><strong>Email:</strong> {admin ? "admin@careconnect.org" : "donor@domain.com"}</p>
      <p><strong>Role:</strong> {admin ? "Administrator" : "Donor"}</p>
      <p><strong>Access Level:</strong> {admin ? "Full Access" : "Restricted"}</p>
    </div>
  );
}
