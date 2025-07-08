"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import Navbar from "../Navbar/page"
import Footer from "../footer/page"
import { Poppins } from "next/font/google"
import { Camera, Heart, ChevronLeft, ChevronRight, Eye, Download } from "lucide-react"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

export default function Gallery() {
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedImage, setSelectedImage] = useState(null)
  const pageSize = 9

  // Sample gallery data - replace with your actual images
  const galleryImages = [
    {
      id: 1,
      src: "/ak.jpg",
      title: "Children's Education Program",
      description: "Supporting education initiatives at local orphanages",
      category: "Education",
    },
    {
      id: 2,
      src: "/ak.jpg",
      title: "Food Distribution Drive",
      description: "Providing nutritious meals to children in need",
      category: "Food",
    },
    {
      id: 3,
      src: "/ak.jpg",
      title: "Healthcare Support",
      description: "Medical checkups and healthcare services",
      category: "Healthcare",
    },
    {
      id: 4,
      src: "/ak.jpg",
      title: "Clothing Donation",
      description: "Warm clothes for winter season",
      category: "Clothing",
    },
    {
      id: 5,
      src: "/ak.jpg",
      title: "Sports Activities",
      description: "Recreational activities and sports equipment",
      category: "Recreation",
    },
    {
      id: 6,
      src: "/ak.jpg",
      title: "Art & Craft Workshop",
      description: "Creative workshops for skill development",
      category: "Education",
    },
    {
      id: 7,
      src: "/ak.jpg",
      title: "Birthday Celebrations",
      description: "Special celebrations and joy moments",
      category: "Events",
    },
    {
      id: 8,
      src: "/ak.jpg",
      title: "Library Setup",
      description: "Creating reading spaces for children",
      category: "Education",
    },
    {
      id: 9,
      src: "/ak.jpg",
      title: "Volunteer Activities",
      description: "Community volunteers making a difference",
      category: "Community",
    },
    
  ]

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const totalPages = Math.ceil(galleryImages.length / pageSize)
  const paginatedImages = galleryImages.slice((page - 1) * pageSize, page * pageSize)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 green
          -t-blue-600 rounded-full animate-spin"></div>
          <Camera className="w-6 h-6 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-gray-500 text-lg mt-4">Loading our gallery...</p>
      </div>
    )
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-indigo-50`}>
      <Navbar />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative pt-24 pb-12 overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-indigo-200/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-200 mb-6"
          >
            <Camera className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Our Impact Gallery</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6"
          >
            Our Gallery
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Capturing moments of joy, hope, and transformation. See the impact of your donations and the smiles you've
            helped create.
          </motion.p>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {paginatedImages.map((image, index) => (
            <motion.div
              key={image.id}
              variants={cardVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 overflow-hidden cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={image.src || "/placeholder.svg"}
                  alt={image.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">View Details</span>
                      </div>
                      <Heart className="w-5 h-5 text-red-400" />
                    </div>
                  </div>
                </div>
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                    {image.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors duration-200">
                  {image.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{image.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Beautiful Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center items-center mt-16 space-x-2"
          >
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="flex items-center space-x-2 px-4 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl border border-white/50 hover:bg-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex space-x-1">
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-12 h-12 rounded-xl font-semibold transition-all duration-300 ${
                      page === pageNum
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-110"
                        : "bg-white/80 backdrop-blur-sm text-gray-700 border border-white/50 hover:bg-white hover:shadow-lg"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="flex items-center space-x-2 px-4 py-3 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl border border-white/50 hover:bg-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Image
                src={selectedImage.src || "/placeholder.svg"}
                alt={selectedImage.title}
                width={800}
                height={600}
                className="w-full h-auto max-h-[60vh] object-cover"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors duration-200"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-blue-100 text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedImage.category}
                </span>
                <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Download</span>
                </button>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedImage.title}</h2>
              <p className="text-gray-600 leading-relaxed">{selectedImage.description}</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      <Footer />
    </div>
  )
}
