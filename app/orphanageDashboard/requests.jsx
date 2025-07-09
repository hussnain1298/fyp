"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { motion } from "framer-motion";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFilter,
  FaMinus,
  FaTimes,
} from "react-icons/fa";
import {
  FileText,
  DollarSign,
  Shirt,
  UtensilsCrossed,
  Package,
  Loader2,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

const PAGE_SIZE = 9;

const REQUEST_TYPES = [
  { value: "Money", label: "Money", icon: DollarSign, maxLimit: 50000 },
  { value: "Clothes", label: "Clothes", icon: Shirt, maxLimit: 200 },
  { value: "Food", label: "Food", icon: UtensilsCrossed, maxLimit: 100 },
  { value: "Other", label: "Other", icon: Package, maxLimit: 500 },
];

const CLOTHES_SUBTYPES = [
  { value: "Jeans", label: "Jeans", icon: "👖" },
  { value: "Shirts", label: "Shirts", icon: "👔" },
  { value: "Shalwar Kameez", label: "Shalwar Kameez", icon: "🥻" },
  { value: "Trousers", label: "Trousers", icon: "👖" },
  { value: "School Uniforms", label: "School Uniforms", icon: "👕" },
  { value: "Winter Clothes", label: "Winter Clothes", icon: "🧥" },
  { value: "Undergarments", label: "Undergarments", icon: "👙" },
  { value: "Shoes", label: "Shoes", icon: "👟" },
];

const FOOD_SUBTYPES = [
  { value: "Rice", label: "Rice", icon: "🍚" },
  { value: "Wheat/Flour", label: "Wheat/Flour", icon: "🌾" },
  { value: "Lentils", label: "Lentils", icon: "🫘" },
  { value: "Vegetables", label: "Vegetables", icon: "🥬" },
  { value: "Fruits", label: "Fruits", icon: "🍎" },
  { value: "Meat/Chicken", label: "Meat/Chicken", icon: "🍗" },
  { value: "Milk/Dairy", label: "Milk/Dairy", icon: "🥛" },
  { value: "Cooking Oil", label: "Cooking Oil", icon: "🫒" },
  { value: "Spices", label: "Spices", icon: "🌶️" },
  { value: "Ready Meals", label: "Ready Meals", icon: "🍽️" },
];

const STATUS_COLORS = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Fulfilled: "bg-green-50 text-green-700 border-green-200",
};

// Read More/Less Component with popup functionality
const ReadMoreText = ({ text, maxLength = 100, request }) => {
  const [showModal, setShowModal] = useState(false);

  if (!text || text.length <= maxLength) {
    return <span>{text}</span>;
  }

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <span>
        {text.substring(0, maxLength)}...
        <button
          onClick={openModal}
          className=" text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
        >
          Read More
        </button>
      </span>

      {/* Full Request Details Modal */}
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="p-4 border-b border-gray-100 rounded-t-2xl">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-gray-800">
                  Request Details
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-800">
                  {request.title}
                </h3>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${
                    STATUS_COLORS[request.status || "Pending"]
                  }`}
                >
                  {request.status || "Pending"}
                </span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Description:
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {request.description}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Request Type:
                </h4>
                <p className="text-green-600 font-semibold text-sm">
                  {request.requestType}
                </p>
              </div>

              {request.subtypes && request.subtypes.length > 0 ? (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                    Items Needed:
                  </h4>
                  <div className="space-y-2">
                    {request.subtypes.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-blue-50 rounded-lg"
                      >
                        <span className="text-blue-700 font-medium text-sm">
                          {item.subtype}
                        </span>
                        <span className="font-semibold text-blue-800 text-sm">
                          {item.donatedAmount || 0} / {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                request.totalQuantity && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                      Quantity:
                    </h4>
                    <p className="text-green-600 font-semibold text-sm">
                      {request.donatedAmount || 0} / {request.totalQuantity}
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Fixed Progress Bar at Bottom */}
            <div className="p-4 border-t border-gray-100 rounded-b-2xl">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                Progress:
              </h4>
              <div className="h-2 w-full bg-gray-200 rounded-full">
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
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

// Loading skeleton component
const RequestSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[500px]">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full"></div>
        <div className="h-4 bg-green-100 rounded w-24"></div>
      </div>
      <div className="h-6 bg-green-100 rounded-full w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-100 rounded w-full"></div>
      <div className="h-4 bg-gray-100 rounded w-3/4"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
      <div className="h-3 bg-gray-100 rounded w-1/3"></div>
    </div>
    <div className="flex space-x-2 mt-auto">
      <div className="h-8 bg-green-100 rounded-lg flex-1"></div>
      <div className="h-8 bg-red-100 rounded-lg flex-1"></div>
    </div>
  </div>
);

export default function RequestsDashboard() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    requestType: "",
    subtypes: [{ subtype: "", quantity: "" }], // Array for multiple subtypes
    quantity: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const fetchRequests = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to view requests");
      return;
    }
    setLoading(true);

    try {
      const q = query(
        collection(firestore, "requests"),
        where("orphanageId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const list = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const request = { id: docSnap.id, ...docSnap.data() };

          // Fetch related donations
          const donationQuery = query(
            collection(firestore, "donations"),
            where("requestId", "==", request.id),
            where("confirmed", "==", true)
          );
          const donationSnap = await getDocs(donationQuery);

          let donated = 0;
          donationSnap.forEach((don) => {
            const data = don.data();
            if (request.requestType === "Money")
              donated += Number(data.amount || 0);
            if (request.requestType === "Clothes")
              donated += Number(data.numClothes || 0);
            if (request.requestType === "Food")
              donated += Number(data.numMeals || 0);
          });

          return {
            ...request,
            donatedAmount: donated,
            progress: request.totalQuantity
              ? Math.min((donated / request.totalQuantity) * 100, 100)
              : 0,
          };
        })
      );

      setRequests(list);
    } catch (err) {
      toast.error("Failed to load requests: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const validateForm = useCallback(() => {
    const errors = [];

    if (!form.title?.trim()) {
      errors.push("Title is required");
    } else if (form.title.length > 30) {
      errors.push("Title must be 30 characters or less");
    }

    if (!form.description?.trim()) {
      errors.push("Description is required");
    } else if (form.description.length < 60) {
      errors.push("Description must be at least 60 characters");
    } else if (form.description.length > 250) {
      errors.push("Description must be 250 characters or less");
    }

    if (!form.requestType) {
      errors.push("Request type is required");
    }

    // For Money and Other types, validate single quantity
    if (form.requestType === "Money" || form.requestType === "Other") {
      if (
        !form.quantity ||
        isNaN(form.quantity) ||
        Number(form.quantity) <= 0
      ) {
        errors.push("Quantity is required and must be a positive number");
      } else {
        const requestTypeConfig = REQUEST_TYPES.find(
          (t) => t.value === form.requestType
        );
        const maxLimit = requestTypeConfig?.maxLimit || 1000;
        if (Number(form.quantity) > maxLimit) {
          errors.push(
            `Maximum ${form.requestType.toLowerCase()} quantity is ${maxLimit}`
          );
        }
      }
    }

    // For Clothes and Food, validate subtypes
    if (form.requestType === "Clothes" || form.requestType === "Food") {
      if (!form.subtypes || form.subtypes.length === 0) {
        errors.push(`${form.requestType} subtypes are required`);
      } else {
        let totalQuantity = 0;
        const subtypeNames = new Set();

        for (const subtypeItem of form.subtypes) {
          if (!subtypeItem.subtype) {
            errors.push("All subtype selections are required");
            break;
          }
          if (
            !subtypeItem.quantity ||
            isNaN(subtypeItem.quantity) ||
            Number(subtypeItem.quantity) <= 0
          ) {
            errors.push("All subtype quantities must be positive numbers");
            break;
          }
          if (subtypeNames.has(subtypeItem.subtype)) {
            errors.push("Duplicate subtypes are not allowed");
            break;
          }
          subtypeNames.add(subtypeItem.subtype);
          totalQuantity += Number(subtypeItem.quantity);
        }

        const requestTypeConfig = REQUEST_TYPES.find(
          (t) => t.value === form.requestType
        );
        const maxLimit = requestTypeConfig?.maxLimit || 1000;
        if (totalQuantity > maxLimit) {
          errors.push(
            `Total ${form.requestType.toLowerCase()} quantity cannot exceed ${maxLimit}`
          );
        }
      }
    }

    return errors;
  }, [form]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const typeMatch =
        filterType === "All" || request.requestType === filterType;
      const statusMatch =
        filterStatus === "All" ||
        (request.status || "Pending") === filterStatus;
      return typeMatch && statusMatch;
    });
  }, [requests, filterType, filterStatus]);

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const paginatedRequests = filteredRequests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = validateForm();
    if (errors.length > 0) {
      setFormError(errors.join(", "));
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to create requests");
      return;
    }

    const isEdit = !!form.id;

    // Calculate total quantity
    let totalQuantity = 0;
    if (form.requestType === "Money" || form.requestType === "Other") {
      totalQuantity = Number(form.quantity);
    } else if (form.requestType === "Clothes" || form.requestType === "Food") {
      totalQuantity = form.subtypes.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      );
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      requestType: form.requestType,
      subtypes:
        form.requestType === "Clothes" || form.requestType === "Food"
          ? form.subtypes
          : null,
      quantity:
        form.requestType === "Money" || form.requestType === "Other"
          ? Number(form.quantity)
          : null,
      totalQuantity: totalQuantity,
      orphanageId: user.uid,
      orphanageEmail: user.email,
      status: form.status || "Pending",
      timestamp: serverTimestamp(),
    };

    try {
      setLoading(true);
      if (isEdit) {
        const ref = doc(firestore, "requests", form.id);
        await updateDoc(ref, payload);
        setRequests((prev) =>
          prev.map((r) => (r.id === form.id ? { ...r, ...payload } : r))
        );
        toast.success("Request updated successfully");
      } else {
        const ref = await addDoc(collection(firestore, "requests"), payload);
        setRequests((prev) => [...prev, { id: ref.id, ...payload }]);
        toast.success("Request posted successfully");
      }
      setModalOpen(false);
      setForm({
        title: "",
        description: "",
        requestType: "",
        subtypes: [{ subtype: "", quantity: "" }],
        quantity: "",
      });
    } catch (err) {
      setFormError(err.message);
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this request?")) return;

    try {
      await deleteDoc(doc(firestore, "requests", id));
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success("Request deleted successfully");
    } catch (err) {
      toast.error("Failed to delete request");
    }
  };

  const openModal = (request = null) => {
    if (request) {
      setForm({
        ...request,
        subtypes: request.subtypes || [{ subtype: "", quantity: "" }],
      });
      setEditMode(true);
    } else {
      setForm({
        title: "",
        description: "",
        requestType: "",
        subtypes: [{ subtype: "", quantity: "" }],
        quantity: "",
      });
      setEditMode(false);
    }
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({
      title: "",
      description: "",
      requestType: "",
      subtypes: [{ subtype: "", quantity: "" }],
      quantity: "",
    });
    setFormError("");
  };

  const getSubtypeOptions = () => {
    if (form.requestType === "Clothes") return CLOTHES_SUBTYPES;
    if (form.requestType === "Food") return FOOD_SUBTYPES;
    return [];
  };

  const getMaxLimit = () => {
    const requestTypeConfig = REQUEST_TYPES.find(
      (t) => t.value === form.requestType
    );
    return requestTypeConfig?.maxLimit || 1000;
  };

  const addSubtype = () => {
    // Restrict to maximum 3 items for non-Money types
    if (form.subtypes.length < 3) {
      setForm({
        ...form,
        subtypes: [...form.subtypes, { subtype: "", quantity: "" }],
      });
    }
  };

  const removeSubtype = (index) => {
    if (form.subtypes.length > 1) {
      setForm({
        ...form,
        subtypes: form.subtypes.filter((_, i) => i !== index),
      });
    }
  };

  const updateSubtype = (index, field, value) => {
    const newSubtypes = [...form.subtypes];
    newSubtypes[index][field] = value;
    setForm({
      ...form,
      subtypes: newSubtypes,
    });
  };

  if (loading && requests.length === 0) {
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
            Donation Requests
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create and manage your donation requests to get the support you need
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-500" />
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
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Fulfilled">Fulfilled</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaPlus />
              <span>New Request</span>
            </motion.button>
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
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter((r) => r.status === "Fulfilled").length}
              </div>
              <div className="text-sm text-green-600">Fulfilled</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {filteredRequests.length}
              </div>
              <div className="text-sm text-green-600">Filtered</div>
            </div>
          </div>
        </div>

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
              {filterType !== "All" || filterStatus !== "All"
                ? "Try adjusting your filters"
                : "Create your first request to get started"}
            </p>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Create Request
            </button>
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
                  className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[500px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm font-medium">
                          {request.requestType}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}
                    >
                      {status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-green-700 transition-colors">
                    {request.title}
                  </h3>

                  <div className="text-gray-600 mb-4 leading-relaxed flex-1 min-h-[60px]">
                    <ReadMoreText
                      text={request.description}
                      maxLength={100}
                      request={request}
                    />
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Type:</span>
                      <span className="font-semibold text-green-600">
                        {request.requestType}
                      </span>
                    </div>

                    {/* Display subtypes if available with fixed height container */}
                    {request.subtypes && request.subtypes.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-gray-500 font-medium text-sm">
                          Items:
                        </span>
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {request.subtypes.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded"
                            >
                              <span className="text-blue-700 truncate flex-1 mr-2">
                                {item.subtype}
                              </span>
                              <span className="font-semibold text-blue-800 whitespace-nowrap">
                                {item.donatedAmount || 0} / {item.quantity}
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
                          <span className="font-semibold text-green-600">
                            {request.donatedAmount || 0} /{" "}
                            {request.totalQuantity}
                          </span>
                        </div>
                      )
                    )}

                    <div className="h-2 w-full bg-gray-100 rounded-full mt-1">
                      <div
                        className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                        style={{ width: `${request.progress}%` }}
                      ></div>
                    </div>
                    {typeof request.progress === "number" ? (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {request.progress.toFixed(1)}% completed
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium mt-1">
                        No data
                      </p>
                    )}
                  </div>

                  {/* Fixed buttons at bottom */}
                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => openModal(request)}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FaTrash />
                      <span>Delete</span>
                    </button>
                  </div>
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

        {/* Enhanced Modal with improved size and rounded corners */}
        {modalOpen && (
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
              {/* Modal Header - Fixed */}
              <div className="p-6 border-b border-gray-100 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {editMode ? "Edit Request" : "Create New Request"}
                </h2>

                {/* Move error messages here - static at top */}
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {formError}
                  </div>
                )}
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Remove the formError div from here */}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Title * (Max: 30 characters)
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      maxLength={30}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Enter request title"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {form.title.length}/30 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Description * (60-250 characters)
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      maxLength={250}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                      rows={4}
                      placeholder="Describe what you need and why (minimum 60 characters)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {form.description.length}/250 characters{" "}
                      {form.description.length < 60 &&
                        form.description.length > 0 &&
                        `(${60 - form.description.length} more needed)`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Request Type *
                    </label>
                    <select
                      value={form.requestType}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          requestType: e.target.value,
                          subtypes: [{ subtype: "", quantity: "" }],
                          quantity: "",
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select type</option>
                      {REQUEST_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} (Max: {type.maxLimit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Multiple Subtypes for Clothes and Food with max 3 items restriction */}
                  {(form.requestType === "Clothes" ||
                    form.requestType === "Food") && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-bold text-gray-700">
                          {form.requestType} Items * (Max Total: {getMaxLimit()}
                          )
                        </label>
                        <button
                          type="button"
                          onClick={addSubtype}
                          disabled={form.subtypes.length >= 3}
                          className={`px-3 py-1 rounded-xl text-sm flex items-center space-x-1 transition-all ${
                            form.subtypes.length >= 3
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-green-500 text-white hover:bg-green-600"
                          }`}
                        >
                          <FaPlus className="w-3 h-3" />
                          <span>Add Item</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {form.subtypes.map((subtypeItem, index) => (
                          <div
                            key={index}
                            className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl"
                          >
                            <div className="flex-1">
                              <select
                                value={subtypeItem.subtype}
                                onChange={(e) =>
                                  updateSubtype(
                                    index,
                                    "subtype",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                              >
                                <option value="">
                                  Select {form.requestType.toLowerCase()} type
                                </option>
                                {getSubtypeOptions().map((subtype) => (
                                  <option
                                    key={subtype.value}
                                    value={subtype.value}
                                  >
                                    {subtype.icon} {subtype.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24">
                              <input
                                type="number"
                                value={subtypeItem.quantity}
                                onChange={(e) =>
                                  updateSubtype(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                placeholder="Qty"
                                min="1"
                              />
                            </div>
                            {form.subtypes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSubtype(index)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-all"
                              >
                                <FaMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        Total quantity:{" "}
                        {form.subtypes.reduce(
                          (sum, item) => sum + (Number(item.quantity) || 0),
                          0
                        )}{" "}
                        / {getMaxLimit()} | Items: {form.subtypes.length} / 3
                      </p>
                    </div>
                  )}

                  {/* Single Quantity for Money and Other */}
                  {(form.requestType === "Money" ||
                    form.requestType === "Other") && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Quantity * (Max: {getMaxLimit()})
                      </label>
                      <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) =>
                          setForm({ ...form, quantity: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Enter quantity"
                        min="1"
                        max={getMaxLimit()}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum allowed: {getMaxLimit()}{" "}
                        {form.requestType === "Money" ? "Rs." : "items"}
                      </p>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer - Fixed */}
              <div className="p-6 border-t border-gray-100 rounded-b-2xl">
                <div className="flex space-x-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                  >
                    {loading
                      ? "Saving..."
                      : editMode
                      ? "Update Request"
                      : "Create Request"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
