"use client";
import withAuth from "@/lib/withAuth"; // 🔹 Import Auth HOC
import MyAccount from "./myAccount";

function DonorDashboard({ user }) {
 
  return <MyAccount />;
}

export default withAuth(DonorDashboard, ["Donor"]); // 🔹 Only "Donor" can access
