"use client";

import { useState } from "react";

export default function DeleteHalfDonationsButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleClick = async () => {
    if (!confirm("REALLY delete half of all donations?")) return;

    try {
      setLoading(true);
      const res = await fetch("/api/delete", { method: "POST" });

      if (!res.ok) throw new Error("Request failed");
      const { deleted, totalBefore } = await res.json();
      setMsg(`Deleted ${deleted} of ${totalBefore} donations.`);
    } catch (err) {
      setMsg("Something went wrong 😬");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        {loading ? "Deleting…" : "Delete 50% of Donations"}
      </button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </>
  );
}
