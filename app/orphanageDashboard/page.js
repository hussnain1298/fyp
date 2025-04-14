"use client";
import withAuth from "@/lib/withAuth"; // 🔹 Import Auth HOC
import MyAccount from "./myAccount";

function OrphanageDashboard({ user }) {


  return <MyAccount />;
}

export default withAuth(OrphanageDashboard, ["Orphanage"]); // 🔹 Only "Orphanage" can access
