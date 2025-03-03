"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const courses = [
  {
    title: "Financial Modeling and Valuation",
    category: "Business",
    image: "/finance.jpg",
  },
  {
    title: "Introduction to CSS",
    category: "Web Design",
    image: "/web_design.jpg",
  },
  {
    title: "The Ultimate Drawing Course ",
    category: "Drawing",
    image: "/arts.jpg",
  },
  {
    title: " Web Development Course",
    category: "Web Development",
    image: "/web_devp.jpg",
  },
  {
    title: "Communication Skills",  
    category: "Learning",
    image: "/communication.jpg",
  },
  {
    title: "History of the World",
    category: "Knowledge",
    image: "/history.jpg",
  },
];

export default function ExploreCourses() {
  return (
    <section className={`${poppins.className} py-16 `}>
      <div className="container mx-auto px-6 max-w-4xl"> {/* Reduced max width */}
        {/* Heading Section */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Explore Courses</h2>
          <p className="text-gray-600 text-lg">
            Find the right course to start learning today.
          </p>
        </motion.div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-12 mx-auto">
          {courses.map((course, index) => (
            <motion.div
              key={index}
              className="rounded-lg shadow-md overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              {/* Course Image */}
              <div className="relative">
                <Image
                  src={course.image}
                  alt={course.title}
                  width={400}
                  height={200}
                  className="w-full h-[222px] object-cover"
                />
                {/* Category Badge */}
                <span className="absolute top-2 left-2 bg-blue-400 text-white text-xs px-3 py-1 rounded-full shadow-md">
                  {course.category}
                </span>
              </div>

              {/* Course Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {course.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
