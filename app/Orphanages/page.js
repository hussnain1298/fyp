"use client"

import { useEffect, useState } from "react"
import { firestore } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Poppins } from "next/font/google"
import Navbar from "../Navbar/navbar"
import Footer from "../footer/page"
import { MapPin, Phone, Mail, Building, Heart, ChevronLeft, ChevronRight } from "lucide-react"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const generateColor = (name) => {
  if (!name) return "#3B82F6"
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = "#"
  for (let i = 0; i < 3; i++) {
    const val = (hash >> (i * 8)) & 0xff
    color += ("00" + val.toString(16)).slice(-2)
  }
  return color
}

const getInitial = (name) => {
  if (!name) return "O"
  return name.charAt(0).toUpperCase()
}

export default function Orphanages() {
  const [orphanages, setOrphanages] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 6
  const router = useRouter()

  useEffect(() => {
    const fetchOrphanages = async () => {
      try {
        const q = query(collection(firestore, "users"), where("userType", "==", "Orphanage"))
        const snapshot = await getDocs(q)
        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((org) => org.orgName && org.orgName.trim() !== "")
          .sort((a, b) => a.orgName.toLowerCase().localeCompare(b.orgName.toLowerCase()))

        setOrphanages(data)
      } catch (error) {
        console.error("Error fetching orphanages:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrphanages()
  }, [])

  const totalPages = Math.ceil(orphanages.length / pageSize)
  const paginatedOrphanages = orphanages.slice((page - 1) * pageSize, page * pageSize)

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

  return (
    <div
      className={`${poppins.className} flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-indigo-50`}
    >
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
            className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-green-200 mb-6"
          >
            <Building className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Our Partner Orphanages</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent mb-6"
          >
            Our Orphanages
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Connect with verified orphanages in your community. Each organization is dedicated to providing care,
            education, and hope to children in need.
          </motion.p>
        </div>
      </motion.div>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <Building className="w-6 h-6 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-gray-500 text-lg mt-4">Loading orphanages...</p>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {paginatedOrphanages.map((org) => (
                <motion.div
                  key={org.id}
                  variants={cardVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 overflow-hidden cursor-pointer"
                  onClick={() => router.push(`/chat?chatId=auto&orphanageId=${org.id}`)}
                >
                  {/* Card Header with Gradient */}
                  <div className="h-20 bg-gradient-to-r from-green-400 via-green-500 to-green-600 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-4 right-4">
                      <Heart className="w-5 h-5 text-white/80" />
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className="relative px-6 pb-6">
                    {/* Profile Image/Avatar */}
                    <div className="flex justify-center -mt-10 mb-4">
                      {org.profilePhoto ? (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          <Image
                            src={org.profilePhoto || "/placeholder.svg"}
                            alt={org.orgName || "Orphanage"}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg"
                          style={{ backgroundColor: generateColor(org.orgName) }}
                        >
                          {getInitial(org.orgName)}
                        </div>
                      )}
                    </div>

                    {/* Organization Info */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{org.orgName || "Unnamed Orphanage"}</h3>
                      {org.email && (
                        <div className="flex items-center justify-center space-x-1 text-gray-600 mb-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{org.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-2 mb-6">
                      {org.orgAddress && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-sm truncate">{org.orgAddress}</span>
                        </div>
                      )}

                      {org.city && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="text-sm">{org.city}</span>
                        </div>
                      )}

                      {org.contactNumber && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-sm">{org.contactNumber}</span>
                        </div>
                      )}
                    </div>
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
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
