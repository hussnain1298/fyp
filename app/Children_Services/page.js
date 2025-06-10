"use client";
import Image from "next/image";
import { motion } from "framer-motion";

export default function ChildrenPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-4 py-10 md:px-8 max-w-6xl mx-auto"
    >
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center text-gray-800">
        Children Services
      </h1>
      <p className="mb-10 text-lg md:text-xl text-gray-600 text-center">
        We believe every child deserves love, care, and education.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-2xl shadow-md p-6 md:p-8 transition-all"
        >
          <h2 className="text-2xl font-semibold mb-3 text-gray-800">
            Our Mission
          </h2>
          <p className="text-gray-600 text-base md:text-lg">
            We provide shelter, nutrition, and education for underprivileged children.
            Our services ensure they have a chance for a brighter future.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-2xl shadow-md p-6 md:p-8 transition-all"
        >
          <h2 className="text-2xl font-semibold mb-3 text-gray-800">
            What We Offer
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 text-base md:text-lg">
            <li>Free primary education</li>
            <li>Daily meals and nutrition programs</li>
            <li>Medical assistance and hygiene awareness</li>
            <li>Extracurricular activities and sports</li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}
