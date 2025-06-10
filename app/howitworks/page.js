"use client";
import { useState, useEffect } from "react";
import HowItWorks from "./howitworks";
import FundraisingSection from "./FundraisingSection";
import ShareSection from "./ShareSection";
import Footer from "../footer/page";
import Navbar from "../Navbar/page";

export default function Working() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1500); // simulate 1.5s loading

    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <HowItWorks />
      <FundraisingSection />
      <ShareSection />
      <Footer />
    </div>
  );
}
