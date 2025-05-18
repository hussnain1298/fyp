"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import { FaChalkboardTeacher, FaUsers, FaGraduationCap } from "react-icons/fa";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function Sections() {
  return (
    <section className={`${poppins.className} bg-white py-16`}>
      <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center lg:space-x-12 mt-14">
        {/* Left Section - Content */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center lg:text-left">
            Welcome to Our Learning Platform
          </h1>

          <div className="space-y-8">
            {/* Online Courses */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center bg-orange-200 text-orange-700 rounded-full text-3xl">
                <FaGraduationCap />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Online Courses
                </h2>
                <p className="text-gray-600">
                  Explore a variety of engaging and well-structured online
                  courses designed for all learning levels.
                </p>
              </div>
            </div>

            {/* Expert Teachers */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-200 text-blue-700 rounded-full text-3xl">
                <FaChalkboardTeacher />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Expert Teachers
                </h2>
                <p className="text-gray-600">
                  Learn from industry professionals with years of teaching
                  experience and hands-on knowledge.
                </p>
              </div>
            </div>

            {/* Community */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center bg-green-200 text-green-700 rounded-full text-3xl">
                <FaUsers />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Vibrant Community
                </h2>
                <p className="text-gray-600">
                  Connect with like-minded learners and professionals in a
                  collaborative learning environment.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Section - Image with Animation */}
        <motion.div
          className="flex-1 mt-12 lg:mt-0 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <Image
            src="/tech.png"
            alt="Online Learning"
            className="rounded-lg shadow-lg"
            width={450}
            height={350}
          />
        </motion.div>
      </div>
    </section>
  );
}
