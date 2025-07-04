"use client";

import { useEffect, useState } from "react";
import { firestore, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

export default function RequestsHoverDemo() {
  const [expandedIds, setExpandedIds] = useState([]);
  const [cityFilteredRequests, setCityFilteredRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [city, setCity] = useState("Detecting...");
  const [userCityFilter, setUserCityFilter] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Enhanced location states
  const [locationStatus, setLocationStatus] = useState("detecting");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // NEW: Permission monitoring states
  const [permissionWatcher, setPermissionWatcher] = useState(null);
  const [lastPermissionState, setLastPermissionState] = useState(null);

  const effectiveCity = userCityFilter.trim() || city.trim();

  const [donationNote, setDonationNote] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [activeModalId, setActiveModalId] = useState(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [orphanagesData, setOrphanagesData] = useState({});
  // Add after other state declarations
  const [donationsData, setDonationsData] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Get available cities from orphanages
  useEffect(() => {
    const getAvailableCities = () => {
      const cities = new Set();
      Object.values(orphanagesData).forEach((orphan) => {
        if (orphan.city && orphan.city.trim()) {
          cities.add(orphan.city.trim());
        }
      });
      setAvailableCities(Array.from(cities).sort());
    };

    if (Object.keys(orphanagesData).length > 0) {
      getAvailableCities();
    }
  }, [orphanagesData]);

  // Enhanced geolocation error handler with proper error logging
  const handleGeolocationError = (error) => {
    // Prevent empty error object logging
    if (!error || typeof error !== "object") {
      console.log("Geolocation error: Invalid error object received");
      setLocationStatus("error");
      setLocationError("Unknown location error");
      setCity("Location error");
      setShowLocationPrompt(true);
      setIsRetrying(false);
      return;
    }

    // Detailed error logging without empty objects
    const errorDetails = {
      code: error.code || "unknown",
      message: error.message || "No message provided",
      timestamp: new Date().toISOString(),
    };

    console.log("Geolocation error details:", errorDetails);

    let errorMessage = "";
    let status = "error";

    switch (error.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = "Location access denied";
        status = "denied";
        console.log("Location permission denied by user");
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage = "Location unavailable";
        status = "error";
        console.log("Location position unavailable");
        break;
      case 3: // TIMEOUT
        errorMessage = "Location request timeout";
        status = "error";
        console.log("Location request timed out");
        break;
      default:
        errorMessage = error.message || "Unknown location error";
        status = "error";
        console.log("Unknown geolocation error:", errorMessage);
        break;
    }

    setLocationError(errorMessage);
    setLocationStatus(status);
    setCity("Location " + (status === "denied" ? "denied" : "error"));
    setShowLocationPrompt(true);
    setIsRetrying(false);
  };

  // Enhanced location detection function
  const detectLocation = (isRetry = false, isAutoRetry = false) => {
    if (isRetry && !isAutoRetry) {
      setIsRetrying(true);
      setRetryCount((prev) => prev + 1);
      console.log("Manual retry location detection, attempt:", retryCount + 1);
    } else if (isAutoRetry) {
      console.log("Auto-retry location detection due to permission change");
    } else {
      console.log("Starting initial location detection");
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      setLocationStatus("not_supported");
      setLocationError("Geolocation not supported");
      setCity("Location not supported");
      setShowLocationPrompt(true);
      setIsRetrying(false);
      return;
    }

    setLocationStatus("detecting");
    setLocationError("");

    // Enhanced geolocation options
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: isRetry || isAutoRetry ? 0 : 300000, // Force fresh on retry
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          console.log("Location detected successfully:", {
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
            accuracy: Math.round(position.coords.accuracy) + "m",
            isAutoRetry,
          });

          setLocationStatus("allowed");
          setIsRetrying(false);
          setShowLocationPrompt(false);

          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          );

          if (!res.ok) {
            throw new Error(
              `Geocoding failed: ${res.status} ${res.statusText}`
            );
          }

          const data = await res.json();
          const detectedCity =
            data.city ||
            data.locality ||
            data.principalSubdivision ||
            "Unknown";

          console.log(
            "City detected successfully:",
            detectedCity,
            isAutoRetry ? "(auto-retry)" : ""
          );
          setCity(detectedCity);

          // Show success message for auto-retry
          if (isAutoRetry) {
            console.log("🎉 Location automatically updated to:", detectedCity);
          }
        } catch (geocodingError) {
          console.error("Geocoding error:", {
            message: geocodingError.message,
            status: geocodingError.status || "unknown",
          });
          setLocationStatus("error");
          setLocationError("Failed to determine city");
          setCity("Geocoding error");
          setShowLocationPrompt(true);
          setIsRetrying(false);
        }
      },
      handleGeolocationError,
      options
    );
  };

  // NEW: Setup permission monitoring for real-time updates
  useEffect(() => {
    const setupPermissionMonitoring = async () => {
      if (!navigator.permissions) {
        console.log("Permissions API not supported");
        return;
      }

      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        console.log("Initial permission state:", permission.state);
        setLastPermissionState(permission.state);

        // Listen for permission changes
        const handlePermissionChange = () => {
          console.log(
            "Permission state changed:",
            permission.state,
            "from:",
            lastPermissionState
          );

          // If permission changed from denied to granted, auto-retry location
          if (
            lastPermissionState === "denied" &&
            permission.state === "granted"
          ) {
            console.log(
              "🚀 Permission granted! Auto-retrying location detection..."
            );
            setShowLocationPrompt(false);
            setTimeout(() => {
              detectLocation(true, true); // isRetry=true, isAutoRetry=true
            }, 1000);
          }
          // If permission changed from granted to denied
          else if (
            lastPermissionState === "granted" &&
            permission.state === "denied"
          ) {
            console.log(
              "❌ Permission denied! Switching to all cities mode..."
            );
            setLocationStatus("denied");
            setCity("Location denied");
            setShowLocationPrompt(true);
          }

          setLastPermissionState(permission.state);
        };

        // Add event listener for permission changes
        permission.addEventListener("change", handlePermissionChange);
        setPermissionWatcher(permission);

        return () => {
          permission.removeEventListener("change", handlePermissionChange);
        };
      } catch (error) {
        console.log("Permission monitoring setup failed:", error.message);
      }
    };

    setupPermissionMonitoring();

    // Cleanup on unmount
    return () => {
      if (permissionWatcher) {
        // Note: removeEventListener is handled in the setup function
        setPermissionWatcher(null);
      }
    };
  }, [lastPermissionState]);

  // NEW: Page visibility API - check permission when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        locationStatus === "denied"
      ) {
        console.log(
          "Page became visible, checking if permission was granted..."
        );

        if (navigator.permissions) {
          try {
            const permission = await navigator.permissions.query({
              name: "geolocation",
            });
            if (
              permission.state === "granted" &&
              lastPermissionState === "denied"
            ) {
              console.log(
                "🎉 Permission was granted while away! Auto-retrying..."
              );
              setShowLocationPrompt(false);
              setTimeout(() => {
                detectLocation(true, true);
              }, 500);
            }
          } catch (error) {
            console.log(
              "Permission check on visibility change failed:",
              error.message
            );
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [locationStatus, lastPermissionState]);

  // Initial location detection
  useEffect(() => {
    detectLocation(false);
  }, []);

  // Check if we can request permission again
  const canRequestPermissionAgain = async () => {
    if (!navigator.permissions) {
      return true; // Assume we can try if Permissions API not available
    }

    try {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      console.log("Current permission state:", permission.state);

      // If permission is 'prompt', we can request again
      // If permission is 'denied', browser won't show prompt again
      return permission.state === "prompt";
    } catch (error) {
      console.log("Permission API error:", error.message);
      return true; // Assume we can try if API fails
    }
  };

  // Enhanced retry function with direct permission request
  const handleRetryLocation = async () => {
    console.log("Retry location clicked, attempt:", retryCount + 1);

    const canRequest = await canRequestPermissionAgain();

    if (!canRequest && locationStatus === "denied") {
      // Permission is permanently denied, show helpful message
      const userWantsHelp = confirm(
        "Location access is permanently blocked for this website.\n\n" +
          "To enable location access:\n" +
          "• Click the location icon (🔒) in your address bar\n" +
          "• Select 'Allow' for Location\n" +
          "• The page will automatically detect your location once enabled!\n\n" +
          "Would you like to continue without location access?"
      );

      if (userWantsHelp) {
        setShowLocationPrompt(false);
      }
      return;
    }

    // Reset states for retry
    setShowLocationPrompt(false);
    setLocationError("");

    // Direct location request (this will trigger browser's native permission dialog)
    setTimeout(() => {
      detectLocation(true, false); // isRetry=true, isAutoRetry=false
    }, 500);
  };

  // Cleanup old fulfilled requests
  useEffect(() => {
    const cleanupOldFulfilledRequests = async () => {
      try {
        const q = query(
          collection(firestore, "requests"),
          where("status", "==", "Fulfilled")
        );
        const snapshot = await getDocs(q);
        const now = Timestamp.now();

        const cleanupPromises = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const fulfilledAt =
            data.fulfilledAt || data.updatedAt || data.timestamp;
          if (fulfilledAt && (now.seconds - fulfilledAt.seconds) / 3600 >= 24) {
            cleanupPromises.push(
              deleteDoc(doc(firestore, "requests", docSnap.id))
            );
          }
        });

        if (cleanupPromises.length > 0) {
          await Promise.all(cleanupPromises);
          console.log(
            `Cleaned up ${cleanupPromises.length} old fulfilled requests`
          );
        }
      } catch (error) {
        console.error("Cleanup error:", error.message);
      }
    };

    cleanupOldFulfilledRequests();
  }, []);

  // Real-time listener for orphanages
  useEffect(() => {
    console.log("Setting up orphanages real-time listener...");

    const q = query(
      collection(firestore, "users"),
      where("userType", "==", "Orphanage")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const orphanMap = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          orphanMap[doc.id] = data;
        });

        console.log("Orphanages updated:", Object.keys(orphanMap).length);
        setOrphanagesData(orphanMap);
      },
      (error) => {
        console.error("Orphanages listener error:", error.message);
      }
    );

    return () => {
      console.log("Cleaning up orphanages listener");
      unsubscribe();
    };
  }, []);

  // Real-time listener for donations - ADD THIS AFTER ORPHANAGES LISTENER
  useEffect(() => {
    console.log("Setting up donations real-time listener...");

    const q = query(
      collection(firestore, "donations"),
      where("confirmed", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const donationsMap = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const requestId = data.requestId;

          if (!donationsMap[requestId]) {
            donationsMap[requestId] = [];
          }
          donationsMap[requestId].push(data);
        });

        console.log(
          "Donations updated:",
          Object.keys(donationsMap).length,
          "requests have donations"
        );
        setDonationsData(donationsMap);
      },
      (error) => {
        console.error("Donations listener error:", error.message);
      }
    );

    return () => {
      console.log("Cleaning up donations listener");
      unsubscribe();
    };
  }, []);

  // Real-time listener for requests with improved city filtering logic
  useEffect(() => {
    if (Object.keys(orphanagesData).length === 0) {
      return;
    }

    console.log("Setting up requests listener for:", effectiveCity);
    console.log("Location status:", locationStatus);
    console.log("User city filter:", userCityFilter);
    console.log("Detected city:", city);
    setLoading(true);

    const q = query(collection(firestore, "requests"));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        try {
          const normalizedCity = effectiveCity.toLowerCase();
          const requests = [];

          // Simplified and corrected logic for when to show all requests
          const hasUserFilter = userCityFilter.trim().length > 0;
          const hasValidDetectedLocation =
            locationStatus === "allowed" &&
            city &&
            city !== "Detecting..." &&
            city !== "Unknown" &&
            !city.toLowerCase().includes("location") &&
            !city.toLowerCase().includes("error");

          console.log("Filtering logic:", {
            hasUserFilter,
            hasValidDetectedLocation,
            locationStatus,
            userCityFilter,
            city,
            normalizedCity,
          });

          // Show all requests if:
          // 1. Location is denied/error/not supported AND no user filter
          // 2. OR no valid city information available at all
          const shouldShowAllRequests =
            (!hasUserFilter &&
              (locationStatus === "denied" ||
                locationStatus === "error" ||
                locationStatus === "not_supported")) ||
            (!hasUserFilter && !hasValidDetectedLocation && !normalizedCity);

          console.log("Should show all requests:", shouldShowAllRequests);

          // Filter orphanages by city
          const cityFilteredOrphanages = {};
          Object.entries(orphanagesData).forEach(([id, data]) => {
            if (shouldShowAllRequests) {
              // Show all orphanages when no specific filter
              cityFilteredOrphanages[id] = data;
            } else if (hasUserFilter || hasValidDetectedLocation) {
              // Filter by specific city when user searched or location detected
              const cityMatch = (data.city || "").trim().toLowerCase();
              if (cityMatch === normalizedCity) {
                cityFilteredOrphanages[id] = data;
              }
            }
          });

          console.log(
            "Filtered orphanages:",
            Object.keys(cityFilteredOrphanages).length
          );

          // In the requests listener, replace the donation calculation part:
          const requestPromises = querySnapshot.docs.map(async (docSnap) => {
            try {
              const data = docSnap.data();
              const reqId = docSnap.id;

              if (!cityFilteredOrphanages[data.orphanageId]) return null;

              // Use real-time donations data instead of fetching
              let totalDonated = 0;
              const requestDonations = donationsData[reqId] || [];

              requestDonations.forEach((donation) => {
                if (data.requestType === "Money") {
                  totalDonated += Number(donation.amount || 0);
                } else if (data.requestType === "Clothes") {
                  totalDonated += Number(donation.numClothes || 0);
                }
              });

              console.log(
                `Request ${reqId}: ${totalDonated} donated (real-time)`
              );

              return {
                id: reqId,
                ...data,
                orphanInfo: cityFilteredOrphanages[data.orphanageId],
                totalDonated,
                donationsCount: requestDonations.length,
              };
            } catch (error) {
              console.error("Request processing error:", error.message);
              return null;
            }
          });

          const resolvedRequests = await Promise.all(requestPromises);
          const validRequests = resolvedRequests.filter((req) => req !== null);

          console.log("Final requests processed:", validRequests.length);
          setCityFilteredRequests(validRequests);
          setLoading(false);
        } catch (error) {
          console.error("Requests processing error:", error.message);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Requests listener error:", error.message);
        setLoading(false);
      }
    );

    return () => {
      console.log("Cleaning up requests listener");
      unsubscribe();
    };
    // Update the dependency array of requests listener
  }, [
    effectiveCity,
    orphanagesData,
    locationStatus,
    userCityFilter,
    city,
    donationsData,
  ]);

  // Filter requests by type and pagination
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

  // Auth listener
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
    setError("");
  };

  const handleDonationSubmit = async (req) => {
    setError("");
    try {
      if (!user) return setError("Login required.");
      if (req.status === "Fulfilled")
        return setError("Request already fulfilled.");

      if (
        (req.requestType === "Money" || req.requestType === "Clothes") &&
        (!donationAmount ||
          isNaN(donationAmount) ||
          Number(donationAmount) <= 0)
      ) {
        return setError("Enter a valid amount.");
      }

      const donationData = {
        donorId: user.uid,
        donorEmail: user.email,
        orphanageId: req.orphanageId,
        requestId: req.id,
        donationType: req.requestType,
        amount: req.requestType === "Money" ? Number(donationAmount) : null,
        numClothes:
          req.requestType === "Clothes" ? Number(donationAmount) : null,
        foodDescription: req.requestType === "Food" ? req.description : null,
        description: donationNote || "",
        confirmed: false,
        timestamp: serverTimestamp(),
      };

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
      alert("Donation submitted for review.");
    } catch (err) {
      console.error("Donation error:", err.message);
      setError("Donation failed: " + err.message);
    }
  };

  const totalPages = Math.ceil(
    (selectedType === "All"
      ? cityFilteredRequests.length
      : cityFilteredRequests.filter(
          (r) => r.requestType.toLowerCase() === selectedType.toLowerCase()
        ).length) / pageSize
  );

  // Better location display text
  const getLocationDisplayText = () => {
    if (userCityFilter.trim()) {
      return userCityFilter.trim(); // Show user's search
    }

    switch (locationStatus) {
      case "detecting":
        return isRetrying ? "Retrying..." : "Detecting...";
      case "denied":
        return "All Cities (Location Denied)";
      case "error":
        return "All Cities (Location Error)";
      case "not_supported":
        return "All Cities (Not Supported)";
      case "allowed":
        return city;
      default:
        return effectiveCity;
    }
  };

  const getLocationPromptMessage = () => {
    switch (locationStatus) {
      case "denied":
        return "Location access was denied. You can search for specific cities above, or enable location access in your browser - we'll automatically detect your location once enabled!";
      case "error":
        return `Location detection failed: ${locationError}. You can search for specific cities above, or click 'Try Again' to retry.`;
      case "not_supported":
        return "Your browser doesn't support location detection. You can search for specific cities using the search box above.";
      default:
        return "Unable to detect your location. You can search for specific cities using the search box above.";
    }
  };

  return (
    <>
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

        {/* Available Cities Display - ALWAYS SHOW */}
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
          {"All,Food,Money,Clothes".split(",").map((type) => (
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
              const isFood = req.requestType === "Food";
              return (
                <div
                  key={req.id}
                  className="p-5 border rounded-lg shadow bg-white flex flex-col justify-between h-full hover:shadow-lg transition-shadow"
                >
                  {/* Top Content */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg">
                        {req.title || req.requestType}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded text-white text-xs ${
                          req.status === "Fulfilled"
                            ? "bg-green-600"
                            : "bg-yellow-500"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <div className="text-gray-600 mb-2 text-sm">
                      {req.description.length > 100 ? (
                        <>
                          {expandedIds.includes(req.id)
                            ? req.description
                            : `${req.description.slice(0, 100)}... `}
                          <button
                            onClick={() => toggleExpand(req.id)}
                            className="text-green-600 font-medium hover:underline ml-1"
                          >
                            {expandedIds.includes(req.id)
                              ? "Show Less"
                              : "Read More"}
                          </button>
                        </>
                      ) : (
                        req.description
                      )}
                    </div>
                  </div>

                  {/* Fixed Button Placement */}
                  <div className="mt-auto">
                    {!isFood && req.quantity && (
                      <p className="text-sm text-gray-600 mb-2">
                        Donated: {req.totalDonated || 0} of {req.quantity}
                      </p>
                    )}
                    <div className="mt-2 mb-4 text-sm text-gray-500 space-y-1">
                      <p>Orphanage: {req.orphanInfo?.orgName || "N/A"}</p>
                      <p>Location: {req.orphanInfo?.city || "N/A"}</p>
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
      </div>

      {/* Donation Modal */}
      {activeModalId &&
        (() => {
          const req = filteredRequests.find((r) => r.id === activeModalId);
          if (!req) return null;

          const isMoney = req.requestType === "Money";
          const isClothes = req.requestType === "Clothes";

          return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Add Donation Note</h3>
                <textarea
                  value={donationNote}
                  onChange={(e) => setDonationNote(e.target.value)}
                  placeholder="Write something about your donation..."
                  rows={4}
                  className="w-full border border-gray-300 rounded p-2"
                />

                {(isMoney || isClothes) && (
                  <div className="mt-4">
                    <label className="block font-semibold text-sm mb-1">
                      {isMoney ? "Donation Amount" : "Clothes Quantity"}
                    </label>
                    <input
                      type="number"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      placeholder={
                        isMoney
                          ? "Enter donation amount"
                          : "Enter clothes quantity"
                      }
                      className="w-full border border-gray-300 rounded p-2"
                      required
                      min={1}
                    />
                  </div>
                )}

                {error && <p className="text-red-600 mt-2">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setActiveModalId(null)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDonationSubmit(req)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
