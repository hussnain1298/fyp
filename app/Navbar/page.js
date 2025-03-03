"use client";

import React, { useState, useEffect } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed left-0 w-full z-50 transition-all duration-300  ${
        isScrolled
          ? "top-0 h-20 bg-green-600 shadow-md"
          : "top-5 h-16 bg-green-700"
      }`}
    >
      <div className="container mx-auto px-8 lg:px-12 flex items-center justify-between py-5">
        {/* Brand Logo */}
        <h1
          className={` font-medium text-2xl lg:text-3xl xl:text-4xl${
            isScrolled ? "text-black" : "text-white"
          } hover:text-yellow-500`}
        >
          CareConnect.
        </h1>

        {/* Navigation Links */}
        <ul className="hidden md:flex space-x-6 text-sm lg:text-base xl:text-lg">
          {[
            { name: "Home", link: "/" },
            { name: "How It Works", link: "./howitworks" },
            { name: "Donate", link: "/donation" },
            { name: "Gallery", link: "/gallery" },
            { name: "Contact", link: "/contact" },
            { name: "Login", link: "/login" },
          ].map((item) => (
            <li key={item.name}>
              <a
                href={item.link}
                className={`${
                  isScrolled ? "text-black" : "text-white"
                } hover:text-yellow-500`}
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Toggle (Optional) */}
        <button
          className={`block md:hidden text-lg ${
            isScrolled ? "text-black" : "text-white"
          }`}
        >
          ☰
        </button>
      </div>
    </nav>
  );
}
