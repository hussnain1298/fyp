"use client"

import { useEffect, useState, useMemo } from "react"
import { db, auth } from "@/lib/firebase" // Changed from firestore to db for consistency
import { collection, getDocs, query, where } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import ServiceFulfillModal from "./servicefulfillmodal"
import { Calendar, Monitor, MapPin, Users, Clock } from "lucide-react" // Added Clock and Users icons

const workshopCategories = [
  "Academic Skills",
  "Technology & STEM",
  "Arts & Creativity",
  "Personal Development",
  "Career Training",
  "Social Learning",
]

export default function ServicesDisplay() {
  const [expandedDescriptions, setExpandedDescriptions] = useState([])
  const toggleExpandDescription = (id) => {
    setExpandedDescriptions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const [services, setServices] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [modalService, setModalService] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const pageSize = 6

  // Listen for auth state changes to get the current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe() // Cleanup subscription
  }, [])

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      setError("")
      try {
        const orphanSnap = await getDocs(query(collection(db, "users"), where("userType", "==", "Orphanage"))) // Changed from firestore to db

        const orphanMap = {}
        orphanSnap.forEach((doc) => {
          orphanMap[doc.id] = doc.data()
        })

        const svcSnap = await getDocs(collection(db, "services")) // Changed from firestore to db
        const now = Date.now()

        const allServices = svcSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((svc) => {
            // Only show services that are not fulfilled or were fulfilled less than 24 hours ago
            if (svc.status !== "Fulfilled") return true
            if (!svc.lastFulfillmentTime) return true // If fulfilled but no time, show it
            const fulfilledTime = new Date(svc.lastFulfillmentTime).getTime()
            return now - fulfilledTime < 24 * 60 * 60 * 1000
          })
          .filter((svc) => orphanMap[svc.orphanageId]) // Only show services from existing orphanages
          .map((svc) => ({
            ...svc,
            orphanInfo: orphanMap[svc.orphanageId],
          }))

        setServices(allServices)
      } catch (err) {
        console.error("Failed to fetch services:", err)
        setError("Failed to load services. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return services
    return services.filter((svc) => svc.title === selectedCategory)
  }, [services, selectedCategory])

  const totalPages = Math.ceil(filtered.length / pageSize)

  const paginatedServices = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  // Callback for when a service is successfully fulfilled via the modal
  const handleServiceFulfilled = (fulfilledServiceId) => {
    setServices((prev) => prev.filter((svc) => svc.id !== fulfilledServiceId))
    setModalService(null) // Close the modal
  }

  return (
    <div className="max-w-7xl mx-auto px-6 min-h-screen flex flex-col ">
      <h2 className="text-2xl justify-center font-bold text-gray-800 text-center py-12 md:text-3xl lg:text-4xl xl:text-5xl">
        SERVICES
      </h2>
      <p className="text-lg sm:text-xl text-gray-500 mt-4 text-center">
        Your support can bring hope and change to those in need...
      </p>

      <div className="flex justify-end items-center mb-2 mt-4">
        <select
          className="border border-gray-300 rounded px-4 py-2 text-sm hover:border-green-600 "
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setPage(1)
          }}
        >
          <option value="All">All Categories</option>
          {workshopCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <p className="text-center text-red-600 font-medium">{error}</p>
      ) : paginatedServices.length === 0 ? (
        <p className="text-center text-gray-600 font-semibold">No services found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {paginatedServices.map((svc) => (
            <div
              key={svc.id}
              className="relative bg-white rounded-lg shadow-md p-6 flex flex-col justify-between min-h-[200px]"
            >
              <span
                className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold rounded ${
                  svc.status === "Pending"
                    ? "bg-yellow-400 text-yellow-800"
                    : svc.status === "In Progress"
                      ? "bg-blue-600 text-white"
                      : "bg-green-700 text-white"
                }`}
              >
                {svc.status || "Pending"}
              </span>

              <div className="flex flex-col flex-grow gap-2">
                <h3 className="text-xl font-bold text-green-800">{svc.title}</h3>
                <div className="mt-auto">
                  <div className="text-gray-700 text-md flex-grow min-h-[10px] pb-6">
                    {svc.description.length > 70 ? (
                      <>
                        {expandedDescriptions.includes(svc.id)
                          ? svc.description
                          : `${svc.description.slice(0, 70)}... `}
                        <button
                          onClick={() => toggleExpandDescription(svc.id)}
                          className="text-green-600 ml-1 hover:underline text-sm font-medium"
                        >
                          {expandedDescriptions.includes(svc.id) ? "Show Less" : "Read More"}
                        </button>
                      </>
                    ) : (
                      svc.description
                    )}
                  </div>

                  {/* New: Display Frequency, Mode, Duration, and Number of Students */}
                  <div className="space-y-2 text-sm text-gray-600 mt-4">
                    <p className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-green-600" />
                      <strong>Frequency:</strong> {svc.frequency || "N/A"}
                    </p>
                    <p className="flex items-center">
                      {svc.mode === "Online" ? (
                        <Monitor className="w-4 h-4 mr-2 text-green-600" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      )}
                      <strong>Mode:</strong> {svc.mode || "N/A"}
                    </p>
                    <p className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-green-600" />
                      <strong>Duration:</strong> {svc.duration || "N/A"}
                    </p>
                    <p className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-green-600" />
                      <strong>Students:</strong> {svc.numberOfStudents || "N/A"}
                    </p>
                  </div>

                  <p className="text-sm text-gray-500 mt-4">
                    <strong>Orphanage:</strong> {svc.orphanInfo?.orgName || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    <strong>Location:</strong> {svc.orphanInfo?.city || "N/A"}
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setModalService(svc)}
                  disabled={svc.status !== "Pending" || !currentUser}
                  className={`w-full py-2 rounded text-white transition-colors ${
                    svc.status !== "Pending" || !currentUser
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {svc.status === "Fulfilled" ? "Fulfilled" : !currentUser ? "Login to Fulfill" : "Fulfill"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center mt-10 space-x-2">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 rounded ${
                  page === pageNum ? "bg-green-600 text-white shadow" : "bg-gray-200 text-green-800 hover:bg-gray-300"
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>
      )}

      {/* Render the ServiceFulfillModal if modalService is set */}
      {modalService && (
        <ServiceFulfillModal
          service={modalService}
          user={currentUser}
          onFulfill={() => handleServiceFulfilled(modalService.id)}
          onClose={() => setModalService(null)}
        />
      )}
    </div>
  )
}
