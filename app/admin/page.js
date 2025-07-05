"use client"

import { withAuth } from "@/lib/withAuth"
import AdminDashboard from "./admindashboard"

function AdminPage({ user }) {
  return <AdminDashboard user={user} />
}

export default withAuth(AdminPage, ["admin"])
