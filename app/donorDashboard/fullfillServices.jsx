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
  Loader2,
} from "lucide-react"

const PAGE_SIZE = 9

// Read More/Less Component
const ReadMoreText = ({ text, maxLength = 50 }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text || text.length <= maxLength) {
    return <span>{text}</span>
  }

  return (
    <span>
      {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
      >
        {isExpanded ? "Read Less" : "Read More"}
      </button>
    </span>
  )
}

// Loading skeleton component
const ServiceSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[420px]">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full"></div>
        <div className="h-4 bg-green-100 rounded w-32"></div>
      </div>
      <div className="h-6 bg-green-100 rounded-full w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
    <div className="space-y-3 mb-4">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="h-10 bg-green-100 rounded-xl w-full mt-auto"></div>
  </div>
)

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

    if (filterCategory !== "All") {
      filtered = filtered.filter((s) => s.title === filterCategory)
    }

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
      fetchServices()
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
    return mode === "Online" ? (
      <Monitor className="w-4 h-4 text-green-600" />
    ) : (
      <MapPinIcon className="w-4 h-4 text-green-600" />
    )
  }

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE)
  const paginatedServices = filteredServices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Loading Services...</h2>
            <p className="text-gray-600">Finding opportunities to share your skills</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ServiceSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <GraduationCap className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Offer Educational Services</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Help orphanages by offering educational services and making a lasting impact on children's lives
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title, description, or orphanage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-12 pr-8 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white min-w-[220px] transition-all"
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
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredServices.length} service{filteredServices.length !== 1 ? "s" : ""}
              </div>
              <div className="text-sm text-green-600 font-medium">
                Page {page} of {totalPages}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {/* Services Grid */}
        {paginatedServices.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <GraduationCap className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">No services found</h3>
            <p className="text-gray-500 text-lg">
              {searchTerm || filterCategory !== "All"
                ? "Try adjusting your search or filter criteria"
                : "Check back later for new service opportunities"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {paginatedServices.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[420px] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      {service.title}
                    </span>
                  </div>
                  <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full text-xs font-medium">
                    {service.status}
                  </span>
                </div>

                {/* Description */}
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-green-700 transition-colors">
                  {service.title}
                </h3>
                <div className="text-gray-600 mb-4 leading-relaxed flex-1">
                  <ReadMoreText text={service.description} maxLength={50} />
                </div>

                {/* Service Details */}
                <div className="space-y-3 mb-4 p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-700">
                      <Calendar className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium">{service.frequency || "Daily"}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      {getModeIcon(service.mode)}
                      <span className="ml-2 font-medium">{service.mode || "Online"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-700">
                      <Clock className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium">{service.duration || "One Day"}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Users className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium">{service.numberOfStudents} students</span>
                    </div>
                  </div>
                </div>

                {/* Orphanage Info */}
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center text-sm text-gray-700">
                    <Building className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-semibold">{service.orphanInfo?.orgName || "N/A"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-green-600" />
                    <span>{service.orphanInfo?.city || "N/A"}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => setActiveModalId(service.id)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl mt-auto"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Offer Service</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex space-x-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    page === i + 1
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-green-50 border border-gray-200 hover:border-green-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Service Fulfillment Modal */}
        {activeModalId && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const service = services.find((s) => s.id === activeModalId)
                if (!service) return null

                return (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold text-gray-800">Offer Service</h3>
                      <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-center space-x-3 mb-4">
                        <GraduationCap className="w-6 h-6 text-green-600" />
                        <span className="font-bold text-gray-800 text-lg">{service.title}</span>
                      </div>
                      <p className="text-gray-600 font-medium mb-6">{service.orphanInfo?.orgName}</p>

                      <div className="bg-green-50 rounded-xl p-6 space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Students:</span>
                          <span className="font-bold text-green-700">{service.numberOfStudents}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Mode:</span>
                          <span className="font-bold text-green-700">{service.mode}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Duration:</span>
                          <span className="font-bold text-green-700">{service.duration}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Frequency:</span>
                          <span className="font-bold text-green-700">{service.frequency}</span>
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleFulfill(service)
                      }}
                      className="space-y-6"
                    >
                      {/* Service Offering Note */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Service Offering Details *</label>
                        <textarea
                          value={donationNote}
                          onChange={(e) => setDonationNote(e.target.value)}
                          placeholder="Describe your qualifications, experience, and how you plan to deliver this service..."
                          rows={5}
                          className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all ${
                            validationErrors.note ? "border-red-500" : "border-gray-200"
                          }`}
                        />
                        {validationErrors.note && <p className="text-red-500 text-sm mt-2">{validationErrors.note}</p>}
                        <p className="text-gray-500 text-sm mt-2">
                          Please include your relevant experience and availability
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-4 pt-6">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={processing}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              <span>Offer Service</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
