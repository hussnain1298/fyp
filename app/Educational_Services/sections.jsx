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
        
        {/* Left Section */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-10 mt-10">
            Welcome to Our Learning Platform
          </h1>

          <div className="flex flex-col gap-y-12">
            {/* Item 1 */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-4 text-center sm:text-left">
              <div className="w-16 h-16 flex items-center justify-center bg-orange-200 text-orange-700 rounded-full text-3xl mb-4 sm:mb-0">
                <FaGraduationCap />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Online Courses</h2>
                <p className="text-gray-600 max-w-md">
                  Explore a variety of engaging and well-structured online courses designed for all learning levels.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-4 text-center sm:text-left">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-200 text-blue-700 rounded-full text-3xl mb-4 sm:mb-0">
                <FaChalkboardTeacher />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Expert Teachers</h2>
                <p className="text-gray-600 max-w-md">
                  Learn from industry professionals with years of teaching experience and hands-on knowledge.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-4 text-center sm:text-left">
              <div className="w-16 h-16 flex items-center justify-center bg-green-200 text-green-700 rounded-full text-3xl mb-4 sm:mb-0">
                <FaUsers />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Vibrant Community</h2>
                <p className="text-gray-600 max-w-md">
                  Connect with like-minded learners and professionals in a collaborative learning environment.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Section - Image */}
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
