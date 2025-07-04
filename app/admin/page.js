"use client";

import dynamic from "next/dynamic";

// Dynamically import AdminDashboard with client-only rendering
const AdminDashboard = dynamic(() => import("./admindashboard"), { ssr: false });

export default function AdminPage() {
  return <AdminDashboard />;
}
