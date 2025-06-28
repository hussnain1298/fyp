"use client";

import { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(firestore, "users", user.uid));
          if (docSnap.exists()) {
            setUserRole(docSnap.data().userType || null);
          }
        } catch (err) {
          console.error("Error fetching role:", err);
        }
      } else {
        setUserRole(null);
      }
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setLoadingRoute(false);
  }, [pathname]);

  const handleNavigation = (e, link) => {
    if (link.startsWith("#")) return;
    e.preventDefault();
    setLoadingRoute(true);
    router.push(link);
    setIsMobileMenuOpen(false);
  };

  const getDonateLink = () => {
    if (userRole === "Donor") return "/donation";
    if (userRole === "Orphanage") return "/confirmation";
    return "/login?redirect=donate";
  };

  const getDashboardLink = () => {
    if (userRole === "Donor") return "/donorDashboard";
    if (userRole === "Orphanage") return "/orphanageDashboard";
    return null;
  };

  const navItems = [
    { name: "Home", link: "/" },
    { name: "How It Works", link: "/howitworks" },
    { name: "Donate", link: getDonateLink() },
    { name: "Gallery", link: "/gallery" },
    { name: "Contact", link: "/contact" },
    { name: "Login", link: "/login" },
  ];

  const dashboardLink = getDashboardLink();
  if (dashboardLink) {
    navItems.splice(3, 0, { name: "Dashboard", link: dashboardLink });
  }

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition duration-300 ${
        isScrolled ? "bg-green-600 shadow-md" : "bg-[rgb(239,239,239)]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        <h1 className="text-3xl font-semibold text-black hover:text-yellow-500 cursor-pointer">
          CareConnect.
        </h1>

        {/* Desktop Nav */}
        <ul className="hidden md:flex space-x-6 text-md font-medium">
          {navItems.map((item) => (
            <li key={item.name}>
              <a
                href={item.link}
                onClick={(e) => handleNavigation(e, item.link)}
                className="text-black hover:text-yellow-500 transition-colors"
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-2xl text-black"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[rgb(239,239,239)]  px-4 pb-4 space-y-2 ">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.link}
              onClick={(e) => handleNavigation(e, item.link)}
              className="block text-black text-sm hover:text-green-600"
            >
              {item.name}
            </a>
          ))}
        </div>
      )}

      {/* Route Loading Indicator */}
      {loadingRoute && (
        <div className="absolute top-full left-0 w-full h-1 bg-green-500 animate-pulse" />
      )}
    </nav>
  );
}
