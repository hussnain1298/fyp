"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const courses = [
  {
    playlistId: "PLbVdwtmx18suuF0meUSymnXvbc6yCtoQd&si=HjcajDpehIrCFeYg",
    title: "Financial Modeling and Valuation",
    category: "Business",
    image: "/finance.jpg",
  },
  {
    playlistId: "PLY14Itt9uf7tfMoG3Bw3f2nqKSJsAaAoP&si=4XGSG9dQRiSd1vCU",
    title: "Introduction to CSS",
    category: "Web Design",
    image: "/web_design.jpg",
  },
  {
    playlistId: "PLkCV754f4ESVUs-PnGD8re8ukJAPOlcY-&si=003kYRjS6c6gAEEJ",
    title: "The Ultimate Drawing Course",
    category: "Drawing",
    image: "/arts.jpg",
  },
  {
    playlistId: "PLVdDKYcXHtGRFliCvM7MgGmOyfmAf4Pq0&si=VkqZlPg79SUFVy_8",
    title: "Web Development Course",
    category: "Web Development",
    image: "/web_devp.jpg",
  },
  {
    playlistId: "PLVdDKYcXHtGRYdGv5xsd0VZ71jZv9Sf3f&si=_YwkGtGZMPTQkqLE",
    title: "Communication Skills",
    category: "Learning",
    image: "/communication.jpg",
  },
  {
    playlistId: "PLS-zsHAq4lsB95gfazal0UWaw5YoYk2xv&si=ZXpeVfjbHPJYrxC3",
    title: "History of the World",
    category: "Knowledge",
    image: "/history.jpg",
  },
];

export default function ExploreCourses() {
  const router = useRouter();

  const handleClick = (playlistId, title) => {
    // Correct path for App Router
    router.push(
      `/Educational_Services/playlist?playlistId=${playlistId}&title=${encodeURIComponent(
        title
      )}`
    );
  };

  return (
    <section className={`${poppins.className} py-16`}>
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Explore Courses
          </h2>
          <p className="text-gray-600 text-lg">
            Find the right course to start learning today.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-12 mx-auto">
          {courses.map((course, index) => (
            <motion.div
              key={index}
              onClick={() => handleClick(course.playlistId, course.title)}
              className="cursor-pointer rounded-lg shadow-md overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <Image
                  src={course.image}
                  alt={course.title}
                  width={400}
                  height={200}
                  className="w-full h-[222px] object-cover"
                />
                <span className="absolute top-2 left-2 bg-blue-400 text-white text-xs px-3 py-1 rounded-full shadow-md">
                  {course.category}
                </span>
              </div>
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
