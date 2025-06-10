"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheckCircle } from "react-icons/fa";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const gateway = searchParams.get("gateway");

  return (
    <section className="min-h-[70vh] flex flex-col justify-center items-center px-6 text-center">
      <FaCheckCircle className="text-green-500 text-5xl mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank you for your donation!</h1>
      <p className="text-gray-600">Your donation via <strong>{gateway || "Gateway"}</strong> was successful.</p>
      {ref && <p className="text-sm mt-2 text-gray-400">Reference ID: {ref}</p>}
    </section>
  );
}
