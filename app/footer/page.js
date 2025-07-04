"use client";

import { useState } from "react";
import { firestore } from "@/lib/firebase"; // Firebase Client SDK
import { collection, addDoc } from "firebase/firestore"; // Firestore methods
import Link from "next/link"; // Import Link for Next.js routing

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const footerLinks = {
    PRODUCT: [
      { name: "Home", href: "/features" },
      { name: "How It Works", href: "/integrations" },
      { name: "Donate Now", href: "/pricing" },
     
    ],
    COMPANY: [
      { name: "Gallery", href: "/privacy" },
        { name: "About Us", href: "/guides" },
      { name: "Contact", href: "/terms" },
    ],
    DEVELOPERS: [
      { name: "Our Donors", href: "/api" },
      { name: "Our Orphanages", href: "/docs" },
    
    ],
  };

  const socialLinks = [
    {
      icon: <i className="fab fa-facebook"></i>,
      href: "https://facebook.com",
      label: "Facebook",
    },
    {
      icon: <i className="fab fa-twitter"></i>,
      href: "https://twitter.com",
      label: "Twitter",
    },
    {
      icon: <i className="fab fa-linkedin"></i>,
      href: "https://linkedin.com",
      label: "LinkedIn",
    },
    // Add other social media links here...
  ];

  // Validate Email Format
  const validateEmail = (email) => {
    const regex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return regex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      // Add the email to the "Our-subscribers" collection in Firestore
     await addDoc(collection(firestore, "subscriptions"), {
  email,
  timestamp: new Date(),
});

      setSuccess("Subscription successful!");
      setEmail(""); // Clear the email input field
    } catch (err) {
      setError("Subscription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-100 pt-10 pb-2 px-4 sm:px-6 lg:px-12 mt-14 w-full">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
      {/* Link Sections */}
      {Object.entries(footerLinks).map(([category, links]) => (
        <div key={category}>
          <h3 className="font-semibold text-sm text-gray-100 mb-4">
            {category}
          </h3>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Subscribe Section */}
      <div className="flex flex-col gap-4">
        <h1 className="text-gray-600 hover:text-gray-900 text-sm mt-9">Want to get notified?</h1>
        <input
          className="w-full px-3 py-2 border rounded-sm text-sm"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="bg-green-600 text-white px-4 py-2 text-sm rounded-md w-fit sm:w-auto"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Subscribing..." : "Subscribe Now"}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
      </div>
    </div>

    {/* Social Media Links */}
    <div className="flex justify-center mt-10 space-x-6">
      {socialLinks.map(({ icon, href, label }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          {icon}
        </a>
      ))}
    </div>

    {/* Copyright */}
    <div className="text-center mt-6 text-gray-500 text-sm">
      © 2025 CareConnect, Inc. All rights reserved.
    </div>
  </div>
</footer>
  )}