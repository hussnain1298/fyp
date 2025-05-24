"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "../Navbar/page";
import Footer from "../footer/page";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function Gallery() {
  const [loading, setLoading] = useState(true);
  const images = [
    "/ak.jpg", "/ak.jpg", "/ak.jpg",
    "/ak.jpg", "/ak.jpg", "/ak.jpg", "/ak.jpg",
  ];

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
    <div className={`${poppins.className} min-h-screen bg-gray-50 pt-16 px-4 sm:px-6 lg:px-12`}>
      <Navbar />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mt-12">OUR GALLERY</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((src, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-lg shadow-md transform transition duration-300 ease-in-out hover:scale-105"
            >
              <Image
                src={src}
                alt={`Gallery Image ${index + 1}`}
                width={500}
                height={500}
                className="w-full h-auto object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
