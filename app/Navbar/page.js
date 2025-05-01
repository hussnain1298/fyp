"use client";

import { useState, useEffect } from "react";
import { auth, firestore } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";  // for navigation

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [userRole, setUserRole] = useState(null);  // To store user role (donor or orphanage)
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const fetchUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(firestore, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserRole(userData.userType || null);  // Set the user role (donor or orphanage)
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      }
      setLoading(false);  // Stop loading once user role is fetched
    };

    window.addEventListener("scroll", handleScroll);
    fetchUserRole();  // Fetch user role when component mounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Function to determine the link for "Donate" based on the user's role
  const getDonateLink = () => {
    if (userRole === "Donor") {
      return "/donationform";  // Donor goes to donation form
    } else if (userRole === "Orphanage") {
      return "/confirmation";  // Orphanage goes to confirmation page
    }
    return "#";  // Default fallback if no user role is found
  };

  if (loading) {
    return <div>Loading...</div>;  // Show loading until role is fetched
  }

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
          className={`font-medium text-2xl lg:text-3xl xl:text-4xl ${
            isScrolled ? "text-black" : "text-white"
          } hover:text-yellow-500`}
        >
          CareConnect.
        </h1>

        {/* Navigation Links */}
        <ul className="hidden md:flex space-x-6 text-sm lg:text-base xl:text-lg">
          {[{ name: "Home", link: "/" },
            { name: "How It Works", link: "./howitworks" },
            { name: "Donate", link: getDonateLink() },  // Dynamically set the "Donate" link
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