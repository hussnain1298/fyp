"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Heart,
  Building,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Package,
  MapPin,
  X,
  CheckCircle,
  Plus,
  Minus,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import PaymentModule from "../payment/paymentModule";

const PAGE_SIZE = 9;

const REQUEST_TYPES = [
  { value: "Money", label: "Money", icon: DollarSign, maxLimit: 50000 },
  { value: "Clothes", label: "Clothes", icon: Shirt, maxLimit: 200 },
  { value: "Food", label: "Food", icon: UtensilsCrossed, maxLimit: 100 },
  { value: "Other", label: "Other", icon: Package, maxLimit: 500 },
];

const STATUS_COLORS = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Fulfilled: "bg-green-50 text-green-700 border-green-200",
};

// Read More/Less Component with complete request card popup
const ReadMoreText = ({ text, maxLength = 100, request }) => {
  const [showModal, setShowModal] = useState(false);

  if (!text || text.length <= maxLength) {
    return <span className="text-xs">{text}</span>;
  }

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <span className="text-xs">
        {text.substring(0, maxLength)}...
        <button
          onClick={openModal}
          className="ml-2 text-green-600 hover:text-green-700 font-medium text-xs transition-colors"
        >
          Read More
        </button>
      </span>

      {/* Complete Request Card Popup */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Complete Request Card Display */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Request Details
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Request Card Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      {(() => {
                        const requestType = REQUEST_TYPES.find(
                          (t) => t.value === request.requestType
                        );
                        const IconComponent = requestType?.icon || Package;
                        return (
                          <IconComponent className="w-4 h-4 text-green-600" />
                        );
                      })()}
                    </div>
                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full text-xs font-medium">
                      {request.requestType}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                      STATUS_COLORS[request.status || "Pending"]
                    }`}
                  >
                    {request.status || "Pending"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-800">
                  {request.title}
                </h3>

                <div className="text-gray-600 text-sm leading-relaxed">
                  {request.description}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Type:</span>
                    <span className="font-semibold text-green-600 text-xs">
                      {request.requestType}
                    </span>
                  </div>

                  {request.subtypes && request.subtypes.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-gray-500 font-medium text-sm">
                        Items:
                      </span>
                      <div className="space-y-1">
                        {request.subtypes.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded"
                          >
                            <span className="text-blue-700 truncate flex-1 mr-2">
                              {item.subtype}
                            </span>
                            <span className="font-semibold text-blue-800 whitespace-nowrap">
                              {request.subtypeDonations?.[item.subtype] || 0} /{" "}
                              {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    request.totalQuantity && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">
                          Donated:
                        </span>
                        <span className="font-semibold text-green-600 text-xs">
                          {request.totalDonated || 0} / {request.totalQuantity}
                        </span>
                      </div>
                    )
                  )}

                  <div className="h-2 w-full bg-gray-100 rounded-full mt-2">
                    <div
                      className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      style={{ width: `${request.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    {typeof request.progress === "number"
                      ? `${request.progress.toFixed(1)}% completed`
                      : "No data"}
                  </p>

                  {/* Orphanage Info */}
                  <div className="mt-3 p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center text-sm text-gray-700 mb-1">
                      <Building className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-semibold text-xs">
                        {request.orphanInfo?.orgName || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-xs">
                        {request.orphanInfo?.city || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    closeModal();
                    window.setActiveModalId(request.id);
                    if (request.subtypes && request.subtypes.length > 0) {
                      window.setSelectedSubtypes([
                        { subtype: "", quantity: "" },
                      ]);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <Heart className="w-4 h-4" />
                  <span>Donate Now</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

// Loading skeleton component
const RequestSkeleton = () => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 animate-pulse h-[480px]">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-green-100 rounded-full"></div>
        <div className="h-4 bg-green-100 rounded w-20"></div>
      </div>
      <div className="h-5 bg-green-100 rounded-full w-14"></div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="h-8 bg-green-100 rounded-lg w-full mt-auto"></div>
  </div>
);

export default function FulfillRequests() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [donationNote, setDonationNote] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedSubtypes, setSelectedSubtypes] = useState([]);
  const [activeModalId, setActiveModalId] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [currentRequest, setCurrentRequest] = useState(null);
  const router = useRouter();

  // Expose functions to window for ReadMoreText component
  useEffect(() => {
    window.setActiveModalId = setActiveModalId;
    window.setSelectedSubtypes = setSelectedSubtypes;
    return () => {
      delete window.setActiveModalId;
      delete window.setSelectedSubtypes;
    };
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterAndSearchRequests();
  }, [requests, searchTerm, filterType]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const reqSnap = await getDocs(collection(firestore, "requests"));
      const rawRequests = reqSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((r) => r.status === "Pending");

      const orphanageIds = [
        ...new Set(rawRequests.map((r) => r.orphanageId).filter(Boolean)),
      ];
      const orphanageMap = {};

      if (orphanageIds.length > 0) {
        const batches = [];
        while (orphanageIds.length) batches.push(orphanageIds.splice(0, 10));
        for (const batch of batches) {
          const orphanSnap = await getDocs(
            query(
              collection(firestore, "users"),
              where("__name__", "in", batch)
            )
          );
          orphanSnap.forEach((doc) => {
            orphanageMap[doc.id] = doc.data();
          });
        }
      }

      const enriched = await Promise.all(
        rawRequests.map(async (r) => {
          const donationSnap = await getDocs(
            query(
              collection(firestore, "donations"),
              where("requestId", "==", r.id),
              where("confirmed", "==", true)
            )
          );
          let totalDonated = 0;
          const subtypeDonations = {};

          donationSnap.forEach((d) => {
            const donationData = d.data();

            if (donationData.subtypes && Array.isArray(donationData.subtypes)) {
              donationData.subtypes.forEach((subtypeItem) => {
                subtypeDonations[subtypeItem.subtype] =
                  (subtypeDonations[subtypeItem.subtype] || 0) +
                  subtypeItem.quantity;
                totalDonated += subtypeItem.quantity;
              });
            } else if (donationData.subtype) {
              const amount = donationData.donatedAmount || 0;
              subtypeDonations[donationData.subtype] =
                (subtypeDonations[donationData.subtype] || 0) + amount;
              totalDonated += amount;
            } else {
              if (r.requestType === "Money") {
                totalDonated += Number(donationData.amount || 0);
              } else if (r.requestType === "Clothes") {
                totalDonated += Number(donationData.numClothes || 0);
              } else if (r.requestType === "Food") {
                totalDonated += Number(donationData.numMeals || 0);
              }
            }
          });

          return {
            ...r,
            totalDonated,
            subtypeDonations,
            orphanInfo: orphanageMap[r.orphanageId] || {},
            progress: r.totalQuantity
              ? Math.min((totalDonated / r.totalQuantity) * 100, 100)
              : 0,
          };
        })
      );

      setRequests(enriched);
      setPage(1);
    } catch (err) {
      setError("Failed to load requests: " + err.message);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSearchRequests = () => {
    let filtered = requests;

    if (filterType !== "All") {
      filtered = filtered.filter((r) => r.requestType === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.orphanInfo?.orgName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
    setPage(1);
  };

  const validateDonation = (request, note, selectedSubtypes) => {
    const errors = {};

    if (!note.trim()) {
      errors.note = "Please add a note about your donation";
    } else if (note.trim().length < 10) {
      errors.note = "Note must be at least 10 characters long";
    }

    if (["Money", "Clothes", "Food"].includes(request.requestType)) {
      if (
        request.requestType === "Money" ||
        !request.subtypes ||
        request.subtypes.length === 0
      ) {
        if (
          !donationAmount ||
          isNaN(donationAmount) ||
          Number(donationAmount) <= 0
        ) {
          const typeText =
            request.requestType === "Food"
              ? "number of meals"
              : "donation amount";
          errors.amount = `Please enter a valid ${typeText}`;
        } else if (Number(donationAmount) > 1000000) {
          errors.amount = "Amount cannot exceed 1,000,000";
        } else if (
          request.requestType === "Money" &&
          Number(donationAmount) < 1
        ) {
          errors.amount = "Minimum donation amount is Rs. 1";
        } else if (
          ["Clothes", "Food"].includes(request.requestType) &&
          Number(donationAmount) < 1
        ) {
          errors.amount = "Minimum quantity is 1";
        }

        const remainingAmount =
          (request.totalQuantity || 0) - (request.totalDonated || 0);
        if (remainingAmount <= 0) {
          errors.amount = "This request is already fulfilled";
        } else if (Number(donationAmount) > remainingAmount) {
          errors.amount = `Cannot donate more than needed. Maximum: ${remainingAmount}`;
        }
      } else {
        if (!selectedSubtypes || selectedSubtypes.length === 0) {
          errors.subtypes = "Please select at least one item to donate";
        } else {
          let hasValidSubtype = false;
          for (const subtypeItem of selectedSubtypes) {
            if (!subtypeItem.subtype) {
              errors.subtypes = "Please select all subtype items";
              break;
            }
            if (
              !subtypeItem.quantity ||
              isNaN(subtypeItem.quantity) ||
              Number(subtypeItem.quantity) <= 0
            ) {
              errors.subtypes = "All quantities must be positive numbers";
              break;
            }

            const requestSubtype = request.subtypes.find(
              (item) => item.subtype === subtypeItem.subtype
            );
            if (requestSubtype) {
              const subtypeDonated =
                request.subtypeDonations?.[subtypeItem.subtype] || 0;
              const remainingAmount = requestSubtype.quantity - subtypeDonated;
              if (remainingAmount <= 0) {
                errors.subtypes = `${subtypeItem.subtype} is already fulfilled`;
                break;
              } else if (Number(subtypeItem.quantity) > remainingAmount) {
                errors.subtypes = `Cannot donate more than needed for ${subtypeItem.subtype}. Maximum: ${remainingAmount}`;
                break;
              }
              hasValidSubtype = true;
            }
          }

          if (!hasValidSubtype && !errors.subtypes) {
            errors.subtypes = "Please select valid items to donate";
          }
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFulfill = async (request) => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to make a donation");
      return;
    }

    const isValid =
      request.requestType === "Money" ||
      !request.subtypes ||
      request.subtypes.length === 0
        ? validateDonation(request, donationNote, [])
        : validateDonation(request, donationNote, selectedSubtypes);

    if (!isValid) {
      toast.error("Please fix the validation errors");
      return;
    }

    if (request.requestType === "Money") {
      setCurrentRequest(request);
      setPaymentAmount(Number(donationAmount));
      setActiveModalId(null);
      setShowPaymentModal(true);
      return;
    }

    setSubmitting(true);
    try {
      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: request.orphanageId,
        requestId: request.id,
        donationType: request.requestType,
        description: donationNote.trim(),
        confirmed: false,
        timestamp: serverTimestamp(),
      };

      if (
        request.subtypes &&
        request.subtypes.length > 0 &&
        selectedSubtypes.length > 0
      ) {
        donationData.subtypes = selectedSubtypes.map((item) => ({
          subtype: item.subtype,
          quantity: Number(item.quantity),
        }));
        donationData.donatedAmount = selectedSubtypes.reduce(
          (sum, item) => sum + Number(item.quantity),
          0
        );
      } else {
        donationData.amount =
          request.requestType === "Money" ? Number(donationAmount) : null;
        donationData.numClothes =
          request.requestType === "Clothes" ? Number(donationAmount) : null;
        donationData.numMeals =
          request.requestType === "Food" ? Number(donationAmount) : null;
        donationData.donatedAmount = Number(donationAmount);
      }

      const donationRef = await addDoc(
        collection(firestore, "donations"),
        donationData
      );

      await updateDoc(doc(firestore, "requests", request.id), {
        donations: arrayUnion(donationRef.id),
      });

      toast.success(
        "Donation submitted successfully! Awaiting orphanage confirmation."
      );
      closeModal();
      fetchRequests();
    } catch (err) {
      toast.error("Error submitting donation: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      if (!currentRequest) return;

      const donationData = {
        donorId: auth.currentUser.uid,
        donorEmail: auth.currentUser.email,
        orphanageId: currentRequest.orphanageId,
        requestId: currentRequest.id,
        donationType: "Money",
        amount: paymentAmount,
        donatedAmount: paymentAmount,
        description: donationNote.trim() || "Payment completed successfully",
        confirmed: true,
        paymentData: {
          transactionId: paymentData.transactionId,
          bank: paymentData.bank.name,
          timestamp: paymentData.timestamp,
        },
        timestamp: serverTimestamp(),
      };

      const donationRef = await addDoc(
        collection(firestore, "donations"),
        donationData
      );

      await updateDoc(doc(firestore, "requests", currentRequest.id), {
        donations: arrayUnion(donationRef.id),
      });

      setShowPaymentModal(false);
      setCurrentRequest(null);
      setPaymentAmount(0);
      setDonationNote("");
      setDonationAmount("");
      setSelectedSubtypes([]);
      setValidationErrors({});

      toast.success("Payment successful! Your donation has been confirmed.");
      fetchRequests();
    } catch (err) {
      console.error("Payment success handler error:", err.message);
      toast.error(
        "Payment was successful but there was an error recording the donation. Please contact support."
      );
    }
  };

  const closeModal = () => {
    setActiveModalId(null);
    setDonationNote("");
    setDonationAmount("");
    setSelectedSubtypes([]);
    setValidationErrors({});
  };

  const addSubtypeSelection = () => {
    if (selectedSubtypes.length < 3) {
      setSelectedSubtypes([...selectedSubtypes, { subtype: "", quantity: "" }]);
    }
  };

  const removeSubtypeSelection = (index) => {
    if (selectedSubtypes.length > 1) {
      setSelectedSubtypes(selectedSubtypes.filter((_, i) => i !== index));
    }
  };

  const updateSubtypeSelection = (index, field, value) => {
    const newSubtypes = [...selectedSubtypes];
    newSubtypes[index][field] = value;
    setSelectedSubtypes(newSubtypes);
  };

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const paginatedRequests = filteredRequests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Loading Requests...
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <RequestSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <FileText className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Fulfill Donation Requests
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Help those in need by fulfilling donation requests from orphanages
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="All">All Types</option>
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {requests.length}
              </div>
              <div className="text-sm text-green-600">Total Requests</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  requests.filter((r) => (r.status || "Pending") === "Pending")
                    .length
                }
              </div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">
                {filteredRequests.length}
              </div>
              <div className="text-sm text-blue-600">Filtered</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <div className="text-2xl font-bold text-purple-600">
                {totalPages}
              </div>
              <div className="text-sm text-purple-600">Pages</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {/* Requests Grid */}
        {paginatedRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <FileText className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">
              No requests found
            </h3>
            <p className="text-gray-500 text-lg mb-6">
              {filterType !== "All" || searchTerm
                ? "Try adjusting your filters"
                : "Check back later for new donation opportunities"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          >
            {paginatedRequests.map((request, index) => {
              const requestType = REQUEST_TYPES.find(
                (t) => t.value === request.requestType
              );
              const status = request.status || "Pending";
              const IconComponent = requestType?.icon || Package;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[480px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full text-xs font-medium">
                        {request.requestType}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}
                    >
                      {status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-green-700 transition-colors line-clamp-2 break-words">
                    {request.title}
                  </h3>

                  <div className="text-gray-600 mb-2 leading-relaxed flex-shrink-0">
                    <ReadMoreText
                      text={request.description}
                      maxLength={100}
                      request={request}
                    />
                  </div>

                  {/* Flexible spacer to push bottom content down */}
                  <div className="flex-1"></div>

                  {/* Money/Items display section */}
                  <div className="mb-2 flex-shrink-0">
                    {request.requestType === "Money" ? (
                      <div className="space-y-1">
                        <span className="text-gray-500 font-medium text-xs">
                          Money needed:
                        </span>
                        <div className="flex justify-between text-xs bg-green-50 px-2 py-1 rounded">
                          <span className="text-green-700">Money</span>
                          <span className="font-semibold text-green-800">
                            {request.totalDonated || 0} /{" "}
                            {request.totalQuantity || request.quantity || 0}
                          </span>
                        </div>
                      </div>
                    ) : request.subtypes && request.subtypes.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-gray-500 font-medium text-xs">
                          Items:
                        </span>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto">
                          {request.subtypes.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded"
                            >
                              <span className="text-blue-700 truncate flex-1 mr-2">
                                {item.subtype}
                              </span>
                              <span className="font-semibold text-blue-800 whitespace-nowrap">
                                {request.subtypeDonations?.[item.subtype] || 0}{" "}
                                / {item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      request.totalQuantity && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 font-medium">
                            Donated:
                          </span>
                          <span className="font-semibold text-green-600">
                            {request.totalDonated || 0} /{" "}
                            {request.totalQuantity}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Progress bar section */}
                  <div className="mb-2 flex-shrink-0">
                    <div className="h-2 w-full bg-gray-100 rounded-full">
                      <div
                        className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                        style={{ width: `${request.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-1">
                      {typeof request.progress === "number"
                        ? `${request.progress.toFixed(1)}% completed`
                        : "No data"}
                    </p>
                  </div>

                  {/* Orphanage Info - right above donate button */}
                  <div className="mb-2 p-2 bg-green-50 rounded-lg flex-shrink-0">
                    <div className="flex items-center text-xs text-gray-700 mb-1">
                      <Building className="w-3 h-3 mr-1 text-green-600" />
                      <span className="font-semibold truncate">
                        {request.orphanInfo?.orgName || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-700">
                      <MapPin className="w-3 h-3 mr-1 text-green-600" />
                      <span className="truncate">
                        {request.orphanInfo?.city || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Donate button - fixed at bottom */}
                  <button
                    onClick={() => {
                      setActiveModalId(request.id);
                      if (request.subtypes && request.subtypes.length > 0) {
                        setSelectedSubtypes([{ subtype: "", quantity: "" }]);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Donate Now</span>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
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
          </motion.div>
        )}

        {/* Enhanced Donation Modal */}
        {activeModalId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            >
              {(() => {
                const request = requests.find((r) => r.id === activeModalId);
                if (!request) return null;

                const hasSubtypes =
                  request.subtypes && request.subtypes.length > 0;
                let remainingAmount = 0;
                let isFullyFulfilled = false;

                if (hasSubtypes) {
                  const availableSubtypes = request.subtypes.filter((item) => {
                    const subtypeDonated =
                      request.subtypeDonations?.[item.subtype] || 0;
                    return item.quantity > subtypeDonated;
                  });
                  isFullyFulfilled = availableSubtypes.length === 0;
                } else {
                  remainingAmount =
                    (request.totalQuantity || 0) - (request.totalDonated || 0);
                  isFullyFulfilled = remainingAmount <= 0;
                }

                return (
                  <>
                    {/* Modal Header - Fixed */}
                    <div className="p-6 border-b border-gray-100 rounded-t-2xl">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-800">
                          Make a Donation
                        </h2>
                        <button
                          onClick={closeModal}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Move error messages here - static at top */}
                      {Object.keys(validationErrors).length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                          {Object.values(validationErrors).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Modal Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* Show subtype breakdown or total remaining */}
                      {hasSubtypes ? (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm text-blue-800 space-y-2">
                            <p className="font-semibold">
                              Items available for donation:
                            </p>
                            {request.subtypes.map((item, idx) => {
                              const subtypeDonated =
                                request.subtypeDonations?.[item.subtype] || 0;
                              const subtypeRemaining =
                                item.quantity - subtypeDonated;
                              return (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.subtype}:</span>
                                  <span
                                    className={
                                      subtypeRemaining > 0
                                        ? "text-green-600 font-bold"
                                        : "text-gray-500"
                                    }
                                  >
                                    {subtypeRemaining > 0
                                      ? `${subtypeRemaining} available`
                                      : "Fulfilled"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        request.totalQuantity && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-800">
                              <p>
                                <strong>Total Needed:</strong>{" "}
                                {request.totalQuantity}
                              </p>
                              <p>
                                <strong>Already Donated:</strong>{" "}
                                {request.totalDonated || 0}
                              </p>
                              <p>
                                <strong>Still Needed:</strong>{" "}
                                <span className="font-bold text-green-600">
                                  {remainingAmount}
                                </span>
                              </p>
                            </div>
                          </div>
                        )
                      )}

                      {isFullyFulfilled ? (
                        <div className="text-center py-4">
                          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                          <p className="text-green-600 font-semibold">
                            This request is already fulfilled!
                          </p>
                          <button
                            onClick={closeModal}
                            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Multiple Subtypes Selection for multi-subtype requests */}
                          {hasSubtypes && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <label className="block font-semibold text-sm">
                                  Select Items to Donate{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={addSubtypeSelection}
                                  disabled={selectedSubtypes.length >= 3}
                                  className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1 ${
                                    selectedSubtypes.length >= 3
                                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                      : "bg-green-500 text-white hover:bg-green-600"
                                  }`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Item</span>
                                </button>
                              </div>

                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {selectedSubtypes.map((subtypeItem, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                                  >
                                    <div className="flex-1">
                                      <select
                                        value={subtypeItem.subtype}
                                        onChange={(e) =>
                                          updateSubtypeSelection(
                                            index,
                                            "subtype",
                                            e.target.value
                                          )
                                        }
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                      >
                                        <option value="">
                                          Select item type
                                        </option>
                                        {request.subtypes.map((item, idx) => {
                                          const subtypeDonated =
                                            request.subtypeDonations?.[
                                              item.subtype
                                            ] || 0;
                                          const subtypeRemaining =
                                            item.quantity - subtypeDonated;
                                          const alreadySelectedElsewhere =
                                            selectedSubtypes.some(
                                              (selected, selectedIndex) =>
                                                selectedIndex !== index &&
                                                selected.subtype ===
                                                  item.subtype
                                            );

                                          return subtypeRemaining > 0 &&
                                            !alreadySelectedElsewhere ? (
                                            <option
                                              key={idx}
                                              value={item.subtype}
                                            >
                                              {item.subtype} ({subtypeRemaining}{" "}
                                              available)
                                            </option>
                                          ) : null;
                                        })}
                                      </select>
                                    </div>
                                    <div className="w-24">
                                      <input
                                        type="number"
                                        value={subtypeItem.quantity}
                                        onChange={(e) =>
                                          updateSubtypeSelection(
                                            index,
                                            "quantity",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Qty"
                                        min="1"
                                        max={(() => {
                                          if (subtypeItem.subtype) {
                                            const requestSubtype =
                                              request.subtypes.find(
                                                (item) =>
                                                  item.subtype ===
                                                  subtypeItem.subtype
                                              );
                                            if (requestSubtype) {
                                              const donated =
                                                request.subtypeDonations?.[
                                                  subtypeItem.subtype
                                                ] || 0;
                                              return (
                                                requestSubtype.quantity -
                                                donated
                                              );
                                            }
                                          }
                                          return 999;
                                        })()}
                                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        required
                                      />
                                    </div>
                                    {selectedSubtypes.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeSubtypeSelection(index)
                                        }
                                        className="text-red-500 hover:text-red-700 p-1 transition-colors"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Single Amount Input for Money and single-type requests */}
                          {!hasSubtypes && (
                            <div className="mt-4">
                              <label className="block font-semibold text-sm mb-1">
                                {request.requestType === "Money"
                                  ? "Donation Amount (Rs.)"
                                  : request.requestType === "Clothes"
                                  ? "Clothes Quantity"
                                  : "Number of Meals"}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                value={donationAmount}
                                onChange={(e) =>
                                  setDonationAmount(e.target.value)
                                }
                                placeholder={`Max: ${remainingAmount}`}
                                className="w-full border border-gray-300 rounded p-2"
                                required
                                min={1}
                                max={remainingAmount}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Maximum you can donate: {remainingAmount}
                              </p>
                            </div>
                          )}

                          <textarea
                            value={donationNote}
                            onChange={(e) => setDonationNote(e.target.value)}
                            placeholder="Write something about your donation..."
                            rows={4}
                            className="w-full border border-gray-300 rounded p-2 mt-4"
                          />
                        </>
                      )}
                    </div>

                    {/* Modal Footer - Fixed */}
                    <div className="p-6 border-t border-gray-100 rounded-b-2xl">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={closeModal}
                          className="px-4 py-2 border rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleFulfill(request)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2"
                          disabled={isFullyFulfilled || submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              {request.requestType === "Money" ? (
                                <>
                                  <DollarSign className="w-4 h-4" />
                                  <span>Proceed to Payment</span>
                                </>
                              ) : (
                                <>
                                  <Heart className="w-4 h-4" />
                                  <span>Submit Donation</span>
                                </>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}

        {/* Payment Modal */}
        <PaymentModule
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setCurrentRequest(null);
            setPaymentAmount(0);
          }}
          amount={paymentAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
}
