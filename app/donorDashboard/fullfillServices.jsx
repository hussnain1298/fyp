"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  GraduationCap,
  MapPin,
  Building,
  Clock,
  Users,
  Monitor,
  MapPinIcon,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
} from "lucide-react"

export default function FulfillServices() {
  const [services, setServices] = useState([])
  const [filteredServices, setFilteredServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeModalId, setActiveModalId] = useState(null)
  const [donationNote, setDonationNote] = useState("")
  const [processing, setProcessing] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [validationErrors, setValidationErrors] = useState({})
  const pageSize = 6
  const router = useRouter()

  const categories = [
    "All",
    "Academic Skills",
    "Technology & STEM",
    "Arts & Creativity",
    "Personal Development",
    "Career Training",
    "Social Learning",
  ]

  useEffect(() => {
    fetchServices()
  }, [])

  useEffect(() => {
    filterAndSearchServices()
  }, [services, searchTerm, filterCategory])

  const fetchServices = async () => {
    setLoading(true)
    setError("")
    try {
      const snap = await getDocs(collection(firestore, "services"))
      const raw = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((s) => s.status === "Pending")

      const orphanageIds = [...new Set(raw.map((s) => s.orphanageId).filter(Boolean))]
      const orphanageMap = {}
      if (orphanageIds.length) {
        const batches = []
        while (orphanageIds.length) batches.push(orphanageIds.splice(0, 10))
        for (const batch of batches) {
          const orphanSnap = await getDocs(query(collection(firestore, "users"), where("__name__", "in", batch)))
          orphanSnap.forEach((doc) => {
            orphanageMap[doc.id] = doc.data()
          })
        }
      }

      const enriched = raw.map((s) => ({
        ...s,
        orphanInfo: orphanageMap[s.orphanageId] || {},
      }))

      setServices(enriched)
      setPage(1)
    } catch (err) {
      setError("Failed to load services: " + err.message)
      toast.error("Failed to load services")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSearchServices = () => {
    let filtered = services

    // Filter by category
    if (filterCategory !== "All") {
      filtered = filtered.filter((s) => s.title === filterCategory)
    }

    // Search by title, description, or orphanage name
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.orphanInfo?.orgName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    setFilteredServices(filtered)
    setPage(1)
  }

  const validateFulfillment = () => {
    const errors = {}

    if (!donationNote.trim()) {
      errors.note = "Please add a note about your service offering"
    } else if (donationNote.trim().length < 20) {
      errors.note = "Note must be at least 20 characters long"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFulfill = async (service) => {
    if (!auth.currentUser) {
      toast.error("Please log in to fulfill this service")
      return
    }

    if (!validateFulfillment()) {
      toast.error("Please fix the validation errors")
      return
    }

    setProcessing(true)
    try {
      const user = auth.currentUser
      await updateDoc(doc(firestore, "services", service.id), {
        status: "In Progress",
        lastFulfillmentNote: donationNote.trim(),
        donorId: user.uid,
        donorEmail: user.email,
        fulfilledAt: serverTimestamp(),
      })

      toast.success("Service fulfillment submitted successfully!")
      closeModal()
      fetchServices() // Refresh data
    } catch (err) {
      toast.error("Failed to fulfill service: " + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const closeModal = () => {
    setActiveModalId(null)
    setDonationNote("")
    setValidationErrors({})
  }

  const getModeIcon = (mode) => {
    return mode === "Online" ? <Monitor className="w-4 h-4" /> : <MapPinIcon className="w-4 h-4" />
  }

  const getModeColor = (mode) => {
    return mode === "Online"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-green-50 text-green-700 border-green-200"
  }

  const totalPages = Math.ceil(filteredServices.length / pageSize)
  const paginatedServices = filteredServices.slice((page - 1) * pageSize, page * pageSize)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={5000} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Share Your Skills</h1>
        <p className="text-gray-600">Help orphanages by offering educational services</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, description, or orphanage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredServices.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Services Grid */}
      {paginatedServices.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No services found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paginatedServices.map((service) => (
            <div
              key={service.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                      {service.title}
                    </span>
                  </div>
                  <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded-full text-xs font-medium">
                    {service.status}
                  </span>
                </div>

                {/* Description */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{service.description}</p>

                {/* Service Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{service.frequency || "Daily"}</span>
                    </div>
                    <div
                      className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getModeColor(service.mode)}`}
                    >
                      {getModeIcon(service.mode)}
                      <span className="ml-1">{service.mode || "Online"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{service.duration || "One Day"}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{service.numberOfStudents} students</span>
                    </div>
                  </div>
                </div>

                {/* Orphanage Info */}
                <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="w-4 h-4 mr-2" />
                    <span className="font-medium">{service.orphanInfo?.orgName || "N/A"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{service.orphanInfo?.city || "N/A"}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setActiveModalId(service.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Offer Service</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                page === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Service Fulfillment Modal */}
      {activeModalId && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const service = services.find((s) => s.id === activeModalId)
              if (!service) return null

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Offer Service</h3>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">{service.title}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{service.orphanInfo?.orgName}</p>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium">{service.numberOfStudents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Mode:</span>
                        <span className="font-medium">{service.mode}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{service.duration}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Frequency:</span>
                        <span className="font-medium">{service.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleFulfill(service)
                    }}
                  >
                    {/* Service Offering Note */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Offering Details *</label>
                      <textarea
                        value={donationNote}
                        onChange={(e) => setDonationNote(e.target.value)}
                        placeholder="Describe your qualifications, experience, and how you plan to deliver this service..."
                        rows={4}
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          validationErrors.note ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {validationErrors.note && <p className="text-red-500 text-sm mt-1">{validationErrors.note}</p>}
                      <p className="text-gray-500 text-xs mt-1">
                        Please include your relevant experience and availability
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={processing}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {processing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Offer Service</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
