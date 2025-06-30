// --- howitworks.jsx ---
"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function HowItWorks() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
  src="/hero.jpg"
  alt="..."
  fill
 style={{ objectFit: "cover", opacity: 0.8,  }}
/>
      </div>

      {/* Text Content */}
      <motion.div
        className="relative z-10 text-white text-center px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-black">
          How It Works
        </h2>
        <p className="mt-4 text-md sm:text-thick md:text-lg max-w-2xl mx-auto text-black">
          Learn how your donations directly impact lives through our secure and transparent system.
        </p>
      </motion.div>
    </section>
  );
}