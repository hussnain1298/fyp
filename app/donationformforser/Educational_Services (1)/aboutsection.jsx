"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function AboutSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = document.getElementById("aboutVideo");
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className={`${poppins.className} py-16 bg-white`}>
      <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left - Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pl-6"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Perfection in learning and growth, unmatched expertise awaits you.
          </h2>
          <p className="text-gray-500 text-lg mb-6">
            Discover eloquence in learning and explore unparalleled growth opportunities.
          </p>
          <p className="text-gray-600">
            Engage in insightful discussions, embrace diverse perspectives, and immerse
            yourself in a world of endless learning possibilities. Achieve excellence
            through meaningful interactions and unlock your full potential.
          </p>
        </motion.div>

        {/* Right - Video Section with Play Button */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative group flex justify-center"
        >
          {/* Video Element */}
          <video
            id="aboutVideo"
            width={450}
            height={300}
            className="rounded-lg shadow-md"
            controls={false}
            poster="/teacher.jpg" // Optional: Set a thumbnail before playing
          >
            <source src="/xyz.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Play Button */}
          {!isPlaying && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-14 h-14 bg-white text-orange-600 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 10.132v4.535a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </motion.button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
