"use client";

import { useEffect, useState, useRef } from "react";
import { firestore, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { FaChevronDown } from "react-icons/fa";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const dropdownRef = useRef();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(firestore, "users", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.userType || null);
            setUserName(data.fullName || null);
          }
        } catch (err) {
          console.error("Error fetching role:", err);
        }
      } else {
        setUserRole(null);
        setUserName(null);
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
     if (userRole === "admin") return "/admin";

    return null;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      setUserName(null);
      setIsDropdownOpen(false);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const navItems = [
    { name: "Home", link: "/" },
    { name: "How It Works", link: "/howitworks" },
    { name: "Donate", link: getDonateLink() },
    { name: "Gallery", link: "/gallery" },
    { name: "Contact", link: "/contact" },
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
        <h1 className="text-3xl font-semibold text-black cursor-pointer">
          CareConnect.
        </h1>

        {/* Desktop Nav */}
        <ul className="hidden md:flex space-x-6 text-md font-medium items-center">
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
          <li>
            {userName ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 text-black hover:text-yellow-500 focus:outline-none"
                >
                  Hello, {userName.split(" ")[0]}{" "}
                  <FaChevronDown className="text-sm" />
                </button>
                {isDropdownOpen && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-50"
                  >
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="/login"
                onClick={(e) => handleNavigation(e, "/login")}
                className="text-black hover:text-yellow-500"
              >
                Login
              </a>
            )}
          </li>
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
        <div className="md:hidden bg-[rgb(239,239,239)] px-4 pb-4 space-y-2">
          {[
            ...navItems,
            userName
              ? { name: `Hello, ${userName.split(" ")[0]}`, link: "#" }
              : { name: "Login", link: "/login" },
          ].map((item) => (
            <a
              key={item.name}
              href={item.link}
              onClick={(e) => handleNavigation(e, item.link)}
              className="block text-black text-sm hover:text-green-600"
            >
              {item.name}
            </a>
          ))}
          {userName && (
            <button
              onClick={handleLogout}
              className="w-full text-left text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          )}
        </div>
      )}

      {/* Route Loading Indicator */}
      {loadingRoute && (
        <div className="absolute top-full left-0 w-full h-1 bg-green-500 animate-pulse" />
      )}
    </nav>
  );
}
