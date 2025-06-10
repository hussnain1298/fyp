"use client"

import { withAuth } from "@/lib/withAuth"

function ProtectedPage({ user }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Protected Page</h1>
      <p>Welcome, {user?.email}!</p>
      <p>Your role: {user?.role}</p>
    </div>
  )
}

// This is how you use the withAuth HOC correctly
export default withAuth(ProtectedPage, ["Donor", "Orphanage"])
