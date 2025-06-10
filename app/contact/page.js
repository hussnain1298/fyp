"use client";
import { useState, useEffect } from "react";
import ContactForm from "./ContactForm";
import ContactInfo from "./ContactInfo";
import Navbar from "../Navbar/page";
import Footer from "../footer/page";

export default function ContactPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <Navbar />
      <div className="max-w-7xl mx-auto mt-10">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mt-20">
            Contact Us
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-gray-500">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="mt-12 bg-white shadow-xl sm:rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-12">
              <ContactForm />
            </div>
            <div className="bg-indigo-50 p-6 sm:p-8 md:p-12">
              <ContactInfo />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
