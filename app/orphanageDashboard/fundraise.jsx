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
  getDoc,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import { motion } from "framer-motion";
import { FaPlus, FaEdit, FaTrash, FaFilter, FaTimes } from "react-icons/fa"; // Added FaTimes for modal close
import { Target, TrendingUp, Loader2 } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

const MAX_DONATION_AMOUNT = 1000000;
const PAGE_SIZE = 9;
const MIN_DESCRIPTION_CHARS = 60;
const MAX_DESCRIPTION_CHARS = 250;
const MAX_CUSTOM_CATEGORY_CHARS = 30;
const READ_MORE_TEXT_LENGTH = 80; // Defined the 80 character limit here

// Updated realistic fundraising categories
const titleOptions = [
  { value: "Medical Emergency", label: "Medical Emergency", icon: "🏥" },
  { value: "Educational Expenses", label: "Educational Expenses", icon: "📚" },
  { value: "Building Maintenance", label: "Building Maintenance", icon: "🏗️" },
  { value: "Monthly Food Supply", label: "Monthly Food Supply", icon: "🍽️" },
  {
    value: "Clothing & Essentials",
    label: "Clothing & Essentials",
    icon: "👕",
  },
  { value: "Utility Bills", label: "Utility Bills", icon: "💡" },
  { value: "Staff Salaries", label: "Staff Salaries", icon: "👥" },
  { value: "Transportation", label: "Transportation", icon: "🚌" },
  { value: "Legal Documentation", label: "Legal Documentation", icon: "📋" },
  { value: "Emergency Relief", label: "Emergency Relief", icon: "🚨" },
  { value: "Custom Category", label: "Custom Category", icon: "📝" },
];

// Utility functions for validation
const countChars = (text) => {
  return text ? text.length : 0; // This will include spaces and all characters
};

const validateCustomCategory = (category) => {
  if (!category || !category.trim()) {
    return "Custom category is required";
  }

  const charCount = countChars(category.trim());
  if (charCount > MAX_CUSTOM_CATEGORY_CHARS) {
    return `Custom category must be ${MAX_CUSTOM_CATEGORY_CHARS} characters or less`;
  }

  return null;
};

const validateDescription = (description) => {
  if (!description || !description.trim()) {
    return "Description is required";
  }

  const charCount = countChars(description.trim());

  if (charCount < MIN_DESCRIPTION_CHARS) {
    return `Description is too short. Please provide at least ${MIN_DESCRIPTION_CHARS} characters to properly describe your request.`;
  }

  if (charCount > MAX_DESCRIPTION_CHARS) {
    return `Description is too long. Please keep it under ${MAX_DESCRIPTION_CHARS} characters.`;
  }

  return null;
};

// NEW: ReadMoreText component with Modal functionality
const FundraiserReadMoreText = ({ text, fundraiser }) => {
  const [showModal, setShowModal] = useState(false);
  const maxLength = READ_MORE_TEXT_LENGTH; // Use the global constant

  if (!text || text.length <= maxLength) {
    return <span>{text}</span>;
  }

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const getProgressPercentage = (raised, total) => {
    return total > 0 ? Math.min((raised / total) * 100, 100) : 0;
  };
  const progress = getProgressPercentage(
    fundraiser.raisedAmount || 0,
    fundraiser.totalAmount || 0
  );

  return (
    <>
      <span>
        {text.substring(0, maxLength)}...
        <button
          onClick={openModal}
          className="ml-1 text-green-600 hover:text-green-700 font-medium text-sm transition-colors underline"
        >
          Read More
        </button>
      </span>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={closeModal} // Close modal on backdrop click
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent modal closing when clicking inside
          >
            {/* Fixed Header */}
            <div className="p-4 border-b border-gray-100 rounded-t-2xl flex-shrink-0">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-gray-800">
                  Fundraiser Details
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {fundraiser.title}
              </h3>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Description:
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {fundraiser.description}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Goal:
                </h4>
                <p className="text-green-600 font-semibold text-sm">
                  Rs. {fundraiser.totalAmount?.toLocaleString() || 0}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Raised:
                </h4>
                <p className="text-green-600 font-semibold text-sm">
                  Rs. {fundraiser.raisedAmount?.toLocaleString() || 0}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">Progress</span>
                  <span className="font-bold text-green-600">
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Orphanage:
                </h4>
                <p className="text-gray-600 text-sm">
                  {fundraiser.orphanageName || "N/A"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2 text-sm">
                  Created On:
                </h4>
                <p className="text-gray-600 text-sm">
                  {fundraiser.createdAt?.toDate
                    ? new Date(
                        fundraiser.createdAt.toDate()
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Fixed Footer with Static Buttons */}
            <div className="p-4 border-t border-gray-100 rounded-b-2xl flex-shrink-0">
              <button
                onClick={closeModal}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

// Loading skeleton component
const FundraiserSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 animate-pulse h-[420px]">
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
    <div className="h-3 bg-gray-100 rounded w-full mb-4"></div>
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

export default function FundRaise() {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editFundraiser, setEditFundraiser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    customTitle: "",
    description: "",
    totalAmount: "",
  });
  const [page, setPage] = useState(1);
  const [filterTitle, setFilterTitle] = useState("All");
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);
  const [customCategoryCharCount, setCustomCategoryCharCount] = useState(0);
  // New state for custom category suggestions
  const [
    filteredCustomCategorySuggestions,
    setFilteredCustomCategorySuggestions,
  ] = useState([]);

  const fetchFundraisers = useCallback(async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to view fundraisers");
      return;
    }

    try {
      const q = query(
        collection(firestore, "fundraisers"),
        where("orphanageId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFundraisers(list);
      setError("");
    } catch (err) {
      setError(err.message);
      toast.error("Failed to load fundraisers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFundraisers();
  }, [fetchFundraisers]);

  const validateForm = useCallback((formData) => {
    const errors = [];

    const finalTitle =
      formData.title === "Custom Category"
        ? formData.customTitle?.trim()
        : formData.title;
    const amt = Number(formData.totalAmount);

    if (!finalTitle) {
      errors.push("Title is required");
    }

    // Validate custom category if selected
    if (formData.title === "Custom Category") {
      const customCategoryError = validateCustomCategory(formData.customTitle);
      if (customCategoryError) {
        errors.push(customCategoryError);
      }
    }

    // Validate description
    const descriptionError = validateDescription(formData.description);
    if (descriptionError) {
      errors.push(descriptionError);
    }

    if (isNaN(amt) || amt < 1) {
      errors.push("Amount must be at least Rs. 1");
    }

    if (amt > MAX_DONATION_AMOUNT) {
      errors.push(
        `Amount cannot exceed Rs. ${MAX_DONATION_AMOUNT.toLocaleString()}`
      );
    }

    return errors;
  }, []);

  const filteredFundraisers = useMemo(() => {
    return fundraisers.filter((fundraiser) => {
      return filterTitle === "All" || fundraiser.title === filterTitle;
    });
  }, [fundraisers, filterTitle]);

  const totalPages = Math.ceil(filteredFundraisers.length / PAGE_SIZE);
  const paginatedFundraisers = filteredFundraisers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this fundraiser?")) return;

    try {
      await deleteDoc(doc(firestore, "fundraisers", id));
      setFundraisers((prev) => prev.filter((f) => f.id !== id));
      toast.success("Fundraiser deleted successfully");
    } catch (err) {
      toast.error("Failed to delete fundraiser");
    }
  };

  const handleEdit = (f) => {
    setEditFundraiser(f);
    setIsEditing(true);
    setModalOpen(true);
    setError("");
    setDescriptionCharCount(countChars(f.description || ""));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validateForm(editFundraiser);
    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    try {
      setLoading(true);
      const { title, description, totalAmount } = editFundraiser;
      const amt = Number(totalAmount);

      const ref = doc(firestore, "fundraisers", editFundraiser.id);
      await updateDoc(ref, { title, description, totalAmount: amt });

      setFundraisers((prev) =>
        prev.map((f) =>
          f.id === editFundraiser.id
            ? { ...f, title, description, totalAmount: amt }
            : f
        )
      );

      toast.success("Fundraiser updated successfully");
      setIsEditing(false);
      setModalOpen(false);
    } catch (err) {
      setError("Failed to update fundraiser");
      toast.error("Failed to update fundraiser");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNew = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validateForm(form);
    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to create fundraisers");
      return;
    }

    try {
      setLoading(true);
      const finalTitle =
        form.title === "Custom Category" ? form.customTitle.trim() : form.title;
      const amt = Number(form.totalAmount);

      const snap = await getDoc(doc(firestore, "users", user.uid));
      const name = snap.exists()
        ? snap.data().orgName || snap.data().name || ""
        : "";

      const data = {
        title: finalTitle,
        description: form.description.trim(),
        totalAmount: amt,
        raisedAmount: 0,
        orphanageId: user.uid,
        orphanageName: name,
        status: "Pending", // Default status
        createdAt: new Date(),
      };

      const ref = await addDoc(collection(firestore, "fundraisers"), data);
      setFundraisers((prev) => [...prev, { id: ref.id, ...data }]);

      toast.success("Fundraiser created successfully");
      setForm({ title: "", customTitle: "", description: "", totalAmount: "" });
      setDescriptionCharCount(0);
      setCustomCategoryCharCount(0);
      setModalOpen(false);
    } catch (err) {
      setError("Failed to create fundraiser");
      toast.error("Failed to create fundraiser");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (fundraiser = null) => {
    if (fundraiser) {
      setEditFundraiser(fundraiser);
      setIsEditing(true);
      setDescriptionCharCount(countChars(fundraiser.description || ""));
    } else {
      setForm({ title: "", customTitle: "", description: "", totalAmount: "" });
      setIsEditing(false);
      setDescriptionCharCount(0);
      setCustomCategoryCharCount(0);
    }
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setIsEditing(false);
    setEditFundraiser(null);
    setForm({ title: "", customTitle: "", description: "", totalAmount: "" });
    setError("");
    setDescriptionCharCount(0);
    setCustomCategoryCharCount(0);
    setFilteredCustomCategorySuggestions([]); // Clear suggestions on close
  };

  const handleDescriptionChange = (e, isEdit = false) => {
    const value = e.target.value;
    const charCount = countChars(value);
    setDescriptionCharCount(charCount);

    if (isEdit) {
      setEditFundraiser({ ...editFundraiser, description: value });
    } else {
      setForm({ ...form, description: value });
    }
  };

  const handleCustomCategoryChange = (e) => {
    const value = e.target.value;
    const charCount = countChars(value);
    setCustomCategoryCharCount(charCount);
    setForm({ ...form, customTitle: value });

    // Filter suggestions based on typed value
    if (value.trim().length > 0) {
      const suggestions = titleOptions.filter(
        (option) =>
          option.value !== "Custom Category" && // Exclude "Custom Category" itself
          option.label.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomCategorySuggestions(suggestions);
    } else {
      setFilteredCustomCategorySuggestions([]); // Clear suggestions if input is empty
    }
  };

  const getProgressPercentage = (raised, total) => {
    return total > 0 ? Math.min((raised / total) * 100, 100) : 0;
  };

  const getDescriptionStatus = () => {
    if (descriptionCharCount < MIN_DESCRIPTION_CHARS) {
      return {
        color: "text-red-500",
        message: `${
          MIN_DESCRIPTION_CHARS - descriptionCharCount
        } more characters needed`,
      };
    } else if (descriptionCharCount > MAX_DESCRIPTION_CHARS) {
      return {
        color: "text-red-500",
        message: `${
          descriptionCharCount - MAX_DESCRIPTION_CHARS
        } characters over limit`,
      };
    } else {
      return { color: "text-green-500", message: "Good length" };
    }
  };

  const getCustomCategoryStatus = () => {
    if (customCategoryCharCount > MAX_CUSTOM_CATEGORY_CHARS) {
      return {
        color: "text-red-500",
        message: `${
          customCategoryCharCount - MAX_CUSTOM_CATEGORY_CHARS
        } characters over limit`,
      };
    } else {
      return { color: "text-green-500", message: "Good length" };
    }
  };

  if (loading && fundraisers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Loading Fundraisers...
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <FundraiserSkeleton key={i} />
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
            <Target className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Fundraising Campaigns
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create and manage your fundraising campaigns to reach your financial
            goals
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-500" />
              <select
                value={filterTitle}
                onChange={(e) => setFilterTitle(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="All">All Categories</option>
                {titleOptions
                  .filter((t) => t.value !== "Custom Category")
                  .map((title) => (
                    <option key={title.value} value={title.value}>
                      {title.label}
                    </option>
                  ))}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaPlus />
              <span>New Fundraiser</span>
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {fundraisers.length}
              </div>
              <div className="text-sm text-green-600">Total Fundraisers</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                Rs.{" "}
                {fundraisers
                  .reduce((sum, f) => sum + (f.raisedAmount || 0), 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-green-600">Total Raised</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                Rs.{" "}
                {fundraisers
                  .reduce((sum, f) => sum + (f.totalAmount || 0), 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-green-600">Total Goal</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {filteredFundraisers.length}
              </div>
              <div className="text-sm text-green-600">Filtered</div>
            </div>
          </div>
        </div>

        {/* Fundraisers Grid */}
        {paginatedFundraisers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <Target className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-600 mb-4">
              No fundraisers found
            </h3>
            <p className="text-gray-500 text-lg mb-6">
              {filterTitle !== "All"
                ? "Try adjusting your filters"
                : "Create your first fundraiser to start raising funds"}
            </p>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Create Fundraiser
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12"
          >
            {paginatedFundraisers.map((fundraiser, index) => {
              const titleOption = titleOptions.find(
                (t) => t.value === fundraiser.title
              );
              const progress = getProgressPercentage(
                fundraiser.raisedAmount || 0,
                fundraiser.totalAmount || 0
              );

              return (
                <motion.div
                  key={fundraiser.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-lg hover:border-green-200 transition-all duration-300 group h-[420px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">
                          {titleOption?.icon || "💰"}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 group-hover:text-green-700 transition-colors">
                        {fundraiser.title}
                      </h3>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>

                  <div className="text-gray-600 mb-4 leading-relaxed flex-1">
                    {/* Updated to use the new FundraiserReadMoreText component */}
                    <FundraiserReadMoreText
                      text={fundraiser.description}
                      fundraiser={fundraiser}
                    />
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">
                        Progress
                      </span>
                      <span className="font-bold text-green-600">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="space-y-3 mb-6 p-4 bg-green-50 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Raised:</span>
                      <span className="font-bold text-green-700">
                        Rs. {(fundraiser.raisedAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">Goal:</span>
                      <span className="font-bold text-gray-800">
                        Rs. {(fundraiser.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-medium">
                        Remaining:
                      </span>
                      <span className="font-bold text-orange-600">
                        Rs.{" "}
                        {Math.max(
                          0,
                          (fundraiser.totalAmount || 0) -
                            (fundraiser.raisedAmount || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => handleEdit(fundraiser)}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(fundraiser.id)}
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

        {/* Modal for Create/Edit Fundraiser */}
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              style={{
                maxHeight: "85vh",
                height: "auto",
                overflow: "hidden",
              }}
            >
              {/* Fixed Header */}
              <div className="p-6 pb-4 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEditing ? "Edit Fundraiser" : "Create New Fundraiser"}
                </h2>
              </div>

              {/* Scrollable Content */}
              <div
                className="px-6 py-4 overflow-y-auto"
                style={{
                  maxHeight: "calc(80vh - 140px)",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cbd5e0 transparent",
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: 6px;
                  }
                  div::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 10px;
                  }
                  div::-webkit-scrollbar-thumb {
                    background: #cbd5e0;
                    border-radius: 10px;
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: #a0aec0;
                  }
                `}</style>

                <form
                  onSubmit={isEditing ? handleSaveEdit : handleSubmitNew}
                  className="space-y-5"
                >
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  {!isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          value={form.title}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              title: e.target.value,
                              customTitle: "",
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          required
                        >
                          <option value="">Select Category</option>
                          {titleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.icon} {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {form.title === "Custom Category" && (
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Custom Category * (Max {MAX_CUSTOM_CATEGORY_CHARS}{" "}
                            characters)
                          </label>
                          <input
                            type="text"
                            placeholder="Enter custom category (e.g., Winter Blankets)"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            value={form.customTitle}
                            onChange={handleCustomCategoryChange}
                            maxLength={MAX_CUSTOM_CATEGORY_CHARS + 10}
                            list="custom-category-suggestions" // Datalist attribute added
                          />
                          {/* Datalist for suggestions */}
                          <datalist id="custom-category-suggestions">
                            {filteredCustomCategorySuggestions.map((option) => (
                              <option key={option.value} value={option.label} />
                            ))}
                          </datalist>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">
                              {customCategoryCharCount}/
                              {MAX_CUSTOM_CATEGORY_CHARS} characters
                            </span>
                            <span
                              className={`text-xs ${
                                getCustomCategoryStatus().color
                              }`}
                            >
                              {getCustomCategoryStatus().message}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Description * ({MIN_DESCRIPTION_CHARS}-
                      {MAX_DESCRIPTION_CHARS} characters)
                    </label>
                    <textarea
                      rows="4"
                      placeholder={`Describe your fundraising goal and how the funds will be used. Please provide at least ${MIN_DESCRIPTION_CHARS} characters to properly explain your request.`}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                      value={
                        isEditing
                          ? editFundraiser?.description || ""
                          : form.description
                      }
                      onChange={(e) => handleDescriptionChange(e, isEditing)}
                      maxLength={MAX_DESCRIPTION_CHARS + 50}
                      required
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {descriptionCharCount} characters
                      </span>
                      <span
                        className={`text-xs ${getDescriptionStatus().color}`}
                      >
                        {getDescriptionStatus().message}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Target Amount (Rs.) *
                    </label>
                    <input
                      type="number"
                      placeholder="Enter target amount"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      value={
                        isEditing
                          ? editFundraiser?.totalAmount || ""
                          : form.totalAmount
                      }
                      onChange={(e) =>
                        isEditing
                          ? setEditFundraiser({
                              ...editFundraiser,
                              totalAmount: e.target.value,
                            })
                          : setForm({ ...form, totalAmount: e.target.value })
                      }
                      min="1"
                      max={MAX_DONATION_AMOUNT}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum amount: Rs. {MAX_DONATION_AMOUNT.toLocaleString()}
                    </p>
                  </div>
                </form>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 pt-4 pb-4 border-t border-gray-100">
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    onClick={isEditing ? handleSaveEdit : handleSubmitNew}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-500 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                  >
                    {loading
                      ? "Saving..."
                      : isEditing
                      ? "Update Fundraiser"
                      : "Create Fundraiser"}
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
