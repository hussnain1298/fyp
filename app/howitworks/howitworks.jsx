"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Navbar from "../Navbar/page";

export default function HowItWorks() {
  return (
    <section className="relative w-full h-screen flex items-center justify-center">
      <Navbar />
      {/* Background Image */}
      <Image
        src="/help.jpg" // Make sure this image is available in the public directory
        alt="How It Works"
        layout="fill"
        objectFit="cover"
        className="z-0"
      />
      {/* Fundraising Section */}
      <div className="relative z-10">
      
      </div>

      {/* Overlay for Darkening Effect */}
      <div className="absolute inset-0 bg-black opacity-20"></div>

      {/* Text Content */}
      <motion.div
        className="absolute text-black text-4xl font-thin z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
    
      </motion.div>
    </section>
  );
}
