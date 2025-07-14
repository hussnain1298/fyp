"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function UpperNavbar({
  navItems,
  handleNavigation,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-4 fixed w-full top-0 z-50 transition-colors duration-300 ${
        isScrolled ? "bg-green-700 shadow-md" : "bg-green-700"
      }`}
    >
      <h1
        className="text-3xl font-medium text-black cursor-pointer transition-colors duration-300 hover:text-yellow-500 "
        onClick={() => handleNavigation(null, "/")}
      >
        CareConnect.
      </h1>

      {/* Desktop Main Nav */}
      <ul className="hidden md:flex space-x-6 text-sm lg:text-base xl:text-lg">
        {navItems.map((item) => (
          <li key={item.name}>
            <a
              href={item.link}
              onClick={(e) => handleNavigation(e, item.link)}
              className="text-black hover:text-yellow-600 transition-colors"
            >
              {item.name}
            </a>
          </li>
        ))}
      </ul>

      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden text-2xl text-black focus:outline-none"
        aria-label="Toggle mobile menu"
      >
        ☰
      </button>
    </div>
  );
}
