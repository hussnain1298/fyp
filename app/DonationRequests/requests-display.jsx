"use client";

import { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { Eye, X, Plus, Minus } from "lucide-react";
import PaymentModule from "../payment/paymentModule";

// Request Details Popup Component
const RequestDetailsPopup = ({ isOpen, onClose, request, onDonate }) => {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
        {/* Fixed Header */}
        <div className="p-4 border-b border-gray-100 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 truncate pr-4">
              {request.title || request.requestType}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <span
            className={`inline-block px-2 py-1 rounded text-white text-xs mt-2 ${
              request.status === "Fulfilled" ? "bg-green-600" : "bg-yellow-500"
            }`}
          >
            {request.status}
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Request Type */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Request Type:
            </h4>
            <p className="text-green-600 font-semibold text-sm">
              {request.requestType}
            </p>
          </div>

          {/* Items needed or Money needed */}
          {((request.subtypes && request.subtypes.length > 0) ||
            request.requestType === "Money") && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {request.requestType === "Money"
                  ? "Money needed:"
                  : "Items needed:"}
              </h4>
              <div className="space-y-1">
                {request.requestType === "Money" && request.quantity ? (
                  <div className="flex justify-between text-xs bg-green-50 px-2 py-1 rounded">
                    <span className="text-green-700">Money</span>
                    <span className="font-semibold text-green-800">
                      {request.totalDonated || 0} / {request.quantity}
                    </span>
                  </div>
                ) : (
                  request.subtypes?.map((item, idx) => {
                    const donated =
                      request.subtypeDonations?.[item.subtype] || 0;
                    return (
                      <div
                        key={idx}
                        className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded"
                      >
                        <span className="text-blue-700 truncate">
                          {item.subtype}
                        </span>
                        <span className="font-semibold text-blue-800 ml-2 flex-shrink-0">
                          {donated} / {item.quantity}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 ">
              Description:
            </h4>
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
              {request.description}
            </p>
          </div>

          {/* Orphanage Info */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Orphanage Details:
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Name: {request.orphanInfo?.orgName || "N/A"}</p>
              <p>Location: {request.orphanInfo?.city || "N/A"}</p>
                 <p>
                Donated: {request.totalDonated || 0}{" "}
                {request.quantity ? `of ${request.quantity} ` : ""}
                {request.requestType === "Food"
                  ? "meals"
                  : request.requestType === "Clothes"
                  ? "items"
                  : "amount"}
              </p> 
            </div>
          </div>
        </div>

        {/* Fixed Footer with Donate Button */}
        <div className="p-4 border-t border-gray-100 rounded-b-2xl flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              onDonate(request);
            }}
            disabled={request.status === "Fulfilled"}
            className={`w-full py-2 px-6 rounded text-white transition-colors ${
              request.status === "Fulfilled"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Donate
          </button>
        </div>
      </div>
    </div>
  );
};

export default function RequestsDisplay({
  cityFilteredRequests,
  loading,
  userCityFilter,
  setUserCityFilter,
  availableCities,
  locationStatus,
  showLocationPrompt,
  setShowLocationPrompt,
  handleRetryLocation,
  isRetrying,
  getLocationDisplayText,
  getLocationPromptMessage,
}) {
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [donationNote, setDonationNote] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [currentRequest, setCurrentRequest] = useState(null);

  // Add selectedSubtypes state for multiple subtype donations
  const [selectedSubtypes, setSelectedSubtypes] = useState([]);
  const [requestDetailsPopup, setRequestDetailsPopup] = useState({
    isOpen: false,
    request: null,
  });

  const effectiveCity = userCityFilter.trim();

  const openRequestDetailsPopup = (request) => {
    setRequestDetailsPopup({ isOpen: true, request });
  };

  const closeRequestDetailsPopup = () => {
    setRequestDetailsPopup({ isOpen: false, request: null });
  };

  useEffect(() => {
    const start = (page - 1) * pageSize;
    const filtered =
      selectedType === "All"
        ? cityFilteredRequests
        : cityFilteredRequests.filter(
            (r) => r.requestType.toLowerCase() === selectedType.toLowerCase()
          );
    setFilteredRequests(filtered.slice(start, start + pageSize));
  }, [selectedType, cityFilteredRequests, page]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return setUserType(null);
      try {
        const snap = await getDoc(doc(firestore, "users", u.uid));
        setUserType(snap.exists() ? snap.data().userType : null);
      } catch (error) {
        console.error("Auth error:", error.message);
        setUserType(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleDonateClick = (req) => {
    if (!user) return alert("Please login to donate.");
    if (userType !== "Donor") return alert("Only donors can make donations.");
    if (req.status === "Fulfilled") return alert("This request is fulfilled.");
    setActiveModalId(req.id);
    setDonationNote("");
    setDonationAmount("");
    setSelectedSubtypes([{ subtype: "", quantity: "" }]);
    setError("");
  };

  const addSubtypeSelection = () => {
    setSelectedSubtypes([...selectedSubtypes, { subtype: "", quantity: "" }]);
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

  const handleDonationSubmit = async (req) => {
    setError("");
    try {
      if (!user) return setError("Login required.");
      if (req.status === "Fulfilled")
        return setError("Request already fulfilled.");

      const hasSubtypes = req.subtypes && req.subtypes.length > 0;

      // Enhanced validation for donation amounts with subtype support
      if (
        req.requestType === "Money" ||
        req.requestType === "Clothes" ||
        req.requestType === "Food"
      ) {
        if (hasSubtypes) {
          // Validate multiple subtypes
          if (!selectedSubtypes || selectedSubtypes.length === 0) {
            return setError("Please select at least one item to donate.");
          }

          for (const subtypeItem of selectedSubtypes) {
            if (!subtypeItem.subtype) {
              return setError("Please select all subtype items.");
            }
            if (
              !subtypeItem.quantity ||
              isNaN(Number(subtypeItem.quantity)) ||
              Number(subtypeItem.quantity) <= 0
            ) {
              return setError("All quantities must be positive numbers.");
            }

            const requestSubtype = req.subtypes.find(
              (item) => item.subtype === subtypeItem.subtype
            );
            if (requestSubtype) {
              const subtypeDonated =
                req.subtypeDonations?.[subtypeItem.subtype] || 0;
              const subtypeRemaining = requestSubtype.quantity - subtypeDonated;

              if (subtypeRemaining <= 0) {
                return setError(`${subtypeItem.subtype} is already fulfilled.`);
              }

              if (Number(subtypeItem.quantity) > subtypeRemaining) {
                return setError(
                  `Cannot donate more than needed for ${subtypeItem.subtype}. Maximum: ${subtypeRemaining}`
                );
              }
            }
          }
        } else {
          // Validate single amount
          if (
            !donationAmount ||
            isNaN(Number(donationAmount)) ||
            Number(donationAmount) <= 0
          ) {
            return setError("Enter a valid amount.");
          }

          const remainingAmount = (req.quantity || 0) - (req.totalDonated || 0);
          if (remainingAmount <= 0) {
            return setError("This request is already fulfilled.");
          }

          if (Number(donationAmount) > remainingAmount) {
            return setError(
              `Cannot donate more than needed. Maximum: ${remainingAmount}`
            );
          }
        }

        // Check maximum limits per request type
        const maxLimits = { Money: 50000, Clothes: 200, Food: 100, Other: 500 };
        const maxLimit = maxLimits[req.requestType] || 1000;
        const totalAmount = hasSubtypes
          ? selectedSubtypes.reduce(
              (sum, item) => sum + Number(item.quantity),
              0
            )
          : Number(donationAmount);

        if (totalAmount > maxLimit) {
          return setError(
            `Maximum ${req.requestType.toLowerCase()} donation is ${maxLimit}`
          );
        }
      }

      // For Money requests, show payment modal instead of direct submission
      if (req.requestType === "Money") {
        setCurrentRequest(req);
        setPaymentAmount(Number(donationAmount));
        setActiveModalId(null);
        setShowPaymentModal(true);
        return;
      }

      // For non-money requests, proceed with normal flow
      const updateField = {
        totalDonated:
          (req.totalDonated || 0) +
          (hasSubtypes
            ? selectedSubtypes.reduce(
                (sum, item) => sum + Number(item.quantity),
                0
              )
            : Number(donationAmount)),
      };

      await updateDoc(doc(firestore, "requests", req.id), updateField);

      const updatedRequests = cityFilteredRequests.map((r) => {
        if (r.id === req.id) {
          return {
            ...r,
            totalDonated: updateField.totalDonated,
          };
        }
        return r;
      });

      const start = (page - 1) * pageSize;
      const filtered =
        selectedType === "All"
          ? updatedRequests
          : updatedRequests.filter(
              (r) => r.requestType.toLowerCase() === selectedType.toLowerCase()
            );
      setFilteredRequests(filtered.slice(start, start + pageSize));

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: req.orphanageId,
        requestId: req.id,
        donationType: req.requestType,
        description: donationNote || "",
        confirmed: false,
        timestamp: serverTimestamp(),
      };

      // Handle multiple subtypes or single donation
      if (hasSubtypes && selectedSubtypes.length > 0) {
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
          req.requestType === "Money" ? Number(donationAmount) : null;
        donationData.numClothes =
          req.requestType === "Clothes" ? Number(donationAmount) : null;
        donationData.numMeals =
          req.requestType === "Food" ? Number(donationAmount) : null;
        donationData.donatedAmount = Number(donationAmount);
      }

      const donationRef = await addDoc(
        collection(firestore, "donations"),
        donationData
      );
      await updateDoc(doc(firestore, "requests", req.id), {
        donations: arrayUnion(donationRef.id),
      });

      setActiveModalId(null);
      setDonationNote("");
      setDonationAmount("");
      setSelectedSubtypes([]);
      alert("Donation submitted for review.");
    } catch (err) {
      console.error("Donation error:", err.message);
      setError("Donation failed: " + err.message);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      if (!currentRequest) return;

      const updateField = {
        totalDonated: (currentRequest.totalDonated || 0) + paymentAmount,
      };

      await updateDoc(
        doc(firestore, "requests", currentRequest.id),
        updateField
      );

      const updatedRequests = cityFilteredRequests.map((r) => {
        if (r.id === currentRequest.id) {
          return {
            ...r,
            totalDonated: (r.totalDonated || 0) + paymentAmount,
          };
        }
        return r;
      });

      const start = (page - 1) * pageSize;
      const filtered =
        selectedType === "All"
          ? updatedRequests
          : updatedRequests.filter(
              (r) => r.requestType.toLowerCase() === selectedType.toLowerCase()
            );
      setFilteredRequests(filtered.slice(start, start + pageSize));

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: currentRequest.orphanageId,
        requestId: currentRequest.id,
        donationType: "Money",
        amount: paymentAmount,
        donatedAmount: paymentAmount,
        description: donationNote || "Payment completed successfully",
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

      alert("Payment successful! Your donation has been confirmed.");
    } catch (err) {
      console.error("Payment success handler error:", err.message);
      alert(
        "Payment was successful but there was an error recording the donation. Please contact support."
      );
    }
  };

  const totalPages = Math.ceil(
    (selectedType === "All"
      ? cityFilteredRequests.length
      : cityFilteredRequests.filter(
          (r) => r.requestType.toLowerCase() === selectedType.toLowerCase()
        ).length) / pageSize
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Enhanced Location Prompt */}
      {showLocationPrompt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Location Access
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{getLocationPromptMessage()}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleRetryLocation}
                  disabled={isRetrying}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying
                    ? "Requesting..."
                    : locationStatus === "denied"
                    ? "Allow Location"
                    : "Try Again"}
                </button>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="text-yellow-800 px-4 py-2 rounded text-sm hover:bg-yellow-100 border border-yellow-300"
                >
                  Continue Without Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and City Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="bg-green-100 text-green-700 font-medium px-4 py-2 rounded shadow">
          📍 Showing requests near <strong>{getLocationDisplayText()}</strong>
          <span className="ml-2 text-xs">
            ({cityFilteredRequests.length} requests)
          </span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={userCityFilter}
            onChange={(e) => setUserCityFilter(e.target.value)}
            placeholder="Search city..."
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            list="cities"
          />
          <datalist id="cities">
            {availableCities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {userCityFilter && (
            <button
              onClick={() => setUserCityFilter("")}
              className="text-gray-500 hover:text-gray-700 px-2 hover:bg-gray-100 rounded"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Available Cities Display */}
      {availableCities.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            {userCityFilter ? "Other available cities:" : "Available cities:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableCities.slice(0, 10).map((city) => (
              <button
                key={city}
                onClick={() => setUserCityFilter(city)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  city.toLowerCase() === effectiveCity.toLowerCase()
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {city}
              </button>
            ))}
            {availableCities.length > 10 && (
              <span className="text-gray-500 text-sm px-2 py-1">
                +{availableCities.length - 10} more...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Type Filter */}
      <div className="flex justify-center gap-4 mb-6">
        {["All", "Food", "Money", "Clothes"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setSelectedType(type);
              setPage(1);
            }}
            className={`px-4 py-2 rounded border transition-colors ${
              selectedType === type
                ? "bg-green-600 text-white"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-lg">No requests found</p>
          <p className="text-gray-500 text-sm mt-2">
            {userCityFilter
              ? `No requests found for "${userCityFilter}". Try searching for a different city.`
              : `No requests available in your area`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((req) => {
            return (
              <div
                key={req.id}
                className="border rounded-lg shadow bg-white flex flex-col h-[500px] hover:shadow-lg transition-shadow"
              >
                {/* Header Section - Fixed */}
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg truncate pr-2">
                      {req.title || req.requestType}
                    </h3>
                    <span
                      className={`inline-block px-2 py-1 rounded text-white text-xs flex-shrink-0 ${
                        req.status === "Fulfilled"
                          ? "bg-green-600"
                          : "bg-yellow-500"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Content Section - Flexible with fixed height for items */}
                <div className="flex-1 p-4 flex flex-col min-h-0">
                  {/* Display subtypes if available OR Money needed section */}
                  {((req.subtypes && req.subtypes.length > 0) ||
                    req.requestType === "Money") && (
                    <div className="mb-3 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {req.requestType === "Money"
                          ? "Money needed:"
                          : "Items needed:"}
                      </div>
                      <div className="space-y-1 max-h-[80px] overflow-y-auto">
                        {req.requestType === "Money" && req.quantity ? (
                          <div className="flex justify-between text-xs bg-green-50 px-2 py-1 rounded">
                            <span className="text-green-700">Money</span>
                            <span className="font-semibold text-green-800">
                              {req.totalDonated || 0} / {req.quantity}
                            </span>
                          </div>
                        ) : (
                          req.subtypes?.map((item, idx) => {
                            const donated =
                              req.subtypeDonations?.[item.subtype] || 0;
                            return (
                              <div
                                key={idx}
                                className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded"
                              >
                                <span className="text-blue-700 truncate">
                                  {item.subtype}
                                </span>
                                <span className="font-semibold text-blue-800 ml-2 flex-shrink-0">
                                  {donated} / {item.quantity}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description Section - Flexible with reduced spacing */}
                  <div className="text-gray-600  text-sm leading-relaxed">
                    {req.description && req.description.length > 100 ? (
                      <>
                        <span>{req.description.substring(0, 100)}...</span>
                        <button
                          onClick={() => openRequestDetailsPopup(req)}
                          className="ml-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors inline-flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </button>
                      </>
                    ) : (
                      <span>{req.description}</span>
                    )}
                  </div>
                </div>

                {/* Footer Section - Fixed */}
                <div className="p-4 border-t border-gray-100 mt-auto flex-shrink-0">
                 
                  {/* {req.totalDonated != null && (
                    <p className="text-sm text-gray-600 mb-2">
                      Donated: {req.totalDonated || 0}{" "}
                      {req.quantity ? `of ${req.quantity} ` : ""}
                      {req.requestType === "Food"
                        ? "meals"
                        : req.requestType === "Clothes"
                        ? "items"
                        : "amount"}
                    </p>
                  )} */}

                  <div className="mb-3 text-sm text-gray-500 space-y-1">
                    <p className="truncate">
                      Orphanage: {req.orphanInfo?.orgName || "N/A"}
                    </p>
                    <p className="truncate">
                      Location: {req.orphanInfo?.city || "N/A"}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDonateClick(req)}
                    disabled={req.status === "Fulfilled"}
                    className={`w-full py-2 px-6 rounded text-white transition-colors ${
                      req.status === "Fulfilled"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    Donate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded transition-colors ${
                page === i + 1
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Enhanced Donation Modal */}
      {activeModalId &&
        (() => {
          const req = filteredRequests.find((r) => r.id === activeModalId);
          if (!req) return null;
          const isMoney = req.requestType === "Money";
          const hasSubtypes = req.subtypes && req.subtypes.length > 0;

          // Calculate remaining amounts for each subtype or total
          let remainingAmount = 0;
          let isFullyFulfilled = false;

          if (hasSubtypes) {
            const availableSubtypes = req.subtypes.filter((item) => {
              const subtypeDonated = req.subtypeDonations?.[item.subtype] || 0;
              return item.quantity > subtypeDonated;
            });
            isFullyFulfilled = availableSubtypes.length === 0;
          } else {
            remainingAmount = (req.quantity || 0) - (req.totalDonated || 0);
            isFullyFulfilled = remainingAmount <= 0;
          }

          return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
                {/* Fixed Header */}
                <div className="p-6 border-b border-gray-100 rounded-t-2xl flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Make a Donation
                    </h3>
                    <button
                      onClick={() => setActiveModalId(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Show subtype breakdown or total remaining */}
                  {hasSubtypes ? (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-800 space-y-2">
                        <p className="font-semibold">
                          Items available for donation:
                        </p>
                        {req.subtypes.map((item, idx) => {
                          const subtypeDonated =
                            req.subtypeDonations?.[item.subtype] || 0;
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
                    req.quantity && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <p>
                            <strong>Total Needed:</strong> {req.quantity}
                          </p>
                          <p>
                            <strong>Already Donated:</strong>{" "}
                            {req.totalDonated || 0}
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
                      <p className="text-green-600 font-semibold">
                        This request is already fulfilled!
                      </p>
                      <button
                        onClick={() => setActiveModalId(null)}
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
                              onClick={addSubtypeSelection}
                              disabled={(() => {
                                // Get available items that haven't been selected yet
                                const availableItems = req.subtypes.filter(
                                  (item) => {
                                    const subtypeDonated =
                                      req.subtypeDonations?.[item.subtype] || 0;
                                    const subtypeRemaining =
                                      item.quantity - subtypeDonated;
                                    const alreadySelected =
                                      selectedSubtypes.some(
                                        (selected) =>
                                          selected.subtype === item.subtype
                                      );
                                    return (
                                      subtypeRemaining > 0 && !alreadySelected
                                    );
                                  }
                                );
                                // Disable if no more items available or if we've reached the limit
                                return (
                                  availableItems.length === 0 ||
                                  selectedSubtypes.length >=
                                    req.subtypes.filter((item) => {
                                      const subtypeDonated =
                                        req.subtypeDonations?.[item.subtype] ||
                                        0;
                                      return item.quantity - subtypeDonated > 0;
                                    }).length
                                );
                              })()}
                              className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1 ${(() => {
                                const availableItems = req.subtypes.filter(
                                  (item) => {
                                    const subtypeDonated =
                                      req.subtypeDonations?.[item.subtype] || 0;
                                    const subtypeRemaining =
                                      item.quantity - subtypeDonated;
                                    const alreadySelected =
                                      selectedSubtypes.some(
                                        (selected) =>
                                          selected.subtype === item.subtype
                                      );
                                    return (
                                      subtypeRemaining > 0 && !alreadySelected
                                    );
                                  }
                                );
                                return availableItems.length === 0 ||
                                  selectedSubtypes.length >=
                                    req.subtypes.filter((item) => {
                                      const subtypeDonated =
                                        req.subtypeDonations?.[item.subtype] ||
                                        0;
                                      return item.quantity - subtypeDonated > 0;
                                    }).length
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-green-500 text-white hover:bg-green-600";
                              })()}`}
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
                                    <option value="">Select item type</option>
                                    {req.subtypes.map((item, idx) => {
                                      const subtypeDonated =
                                        req.subtypeDonations?.[item.subtype] ||
                                        0;
                                      const subtypeRemaining =
                                        item.quantity - subtypeDonated;
                                      // Check if this item is already selected in other dropdowns
                                      const alreadySelectedElsewhere =
                                        selectedSubtypes.some(
                                          (selected, selectedIndex) =>
                                            selectedIndex !== index &&
                                            selected.subtype === item.subtype
                                        );

                                      return subtypeRemaining > 0 &&
                                        !alreadySelectedElsewhere ? (
                                        <option key={idx} value={item.subtype}>
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
                                          req.subtypes.find(
                                            (item) =>
                                              item.subtype ===
                                              subtypeItem.subtype
                                          );
                                        if (requestSubtype) {
                                          const donated =
                                            req.subtypeDonations?.[
                                              subtypeItem.subtype
                                            ] || 0;
                                          return (
                                            requestSubtype.quantity - donated
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
                            {isMoney
                              ? "Donation Amount (Rs.)"
                              : req.requestType === "Clothes"
                              ? "Clothes Quantity"
                              : "Number of Meals"}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(e.target.value)}
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

                      {error && <p className="text-red-600 mt-2">{error}</p>}
                    </>
                  )}
                </div>

                {/* Fixed Footer */}
                <div className="p-6 border-t border-gray-100 rounded-b-2xl flex-shrink-0">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setActiveModalId(null)}
                      className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDonationSubmit(req)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      disabled={isFullyFulfilled}
                    >
                      {isMoney ? "Proceed to Payment" : "Submit Donation"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Request Details Popup */}
      <RequestDetailsPopup
        isOpen={requestDetailsPopup.isOpen}
        onClose={closeRequestDetailsPopup}
        request={requestDetailsPopup.request}
        onDonate={handleDonateClick}
      />

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
  );
}
