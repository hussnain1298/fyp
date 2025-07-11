"use client";

import { useEffect, useState } from "react";

import { firestore } from "../../lib/firebase";

// import { firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

export default function LocationProvider({ children }) {
  const [city, setCity] = useState("Detecting...");
  const [userCityFilter, setUserCityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [availableCities, setAvailableCities] = useState([]);
  const [locationStatus, setLocationStatus] = useState("detecting");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [permissionWatcher, setPermissionWatcher] = useState(null);
  const [lastPermissionState, setLastPermissionState] = useState(null);
  const [orphanagesData, setOrphanagesData] = useState({});
  const [donationsData, setDonationsData] = useState({});
  const [cityFilteredRequests, setCityFilteredRequests] = useState([]);

  const effectiveCity = userCityFilter.trim() || city.trim();

  // Enhanced geolocation error handler
  const handleGeolocationError = (error) => {
    if (!error || typeof error !== "object") {
      console.log("Geolocation error: Invalid error object received");
      setLocationStatus("error");
      setLocationError("Unknown location error");
      setCity("Location error");
      setShowLocationPrompt(true);
      setIsRetrying(false);
      return;
    }

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

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: isRetry || isAutoRetry ? 0 : 300000,
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

  // Setup permission monitoring
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

        const handlePermissionChange = () => {
          console.log(
            "Permission state changed:",
            permission.state,
            "from:",
            lastPermissionState
          );

          if (
            lastPermissionState === "denied" &&
            permission.state === "granted"
          ) {
            console.log(
              "🚀 Permission granted! Auto-retrying location detection..."
            );
            setShowLocationPrompt(false);
            setTimeout(() => {
              detectLocation(true, true);
            }, 1000);
          } else if (
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

    return () => {
      if (permissionWatcher) {
        setPermissionWatcher(null);
      }
    };
  }, [lastPermissionState]);

  // Page visibility API
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

  // Real-time listener for donations
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

  // Cleanup old fulfilled requests - ADD THIS USEEFFECT
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

  // Real-time listener for requests with city filtering
  useEffect(() => {
    if (Object.keys(orphanagesData).length === 0) {
      return;
    }

    console.log("Setting up requests listener for:", effectiveCity);
    setLoading(true);

    const q = query(collection(firestore, "requests"));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        try {
          const normalizedCity = effectiveCity.toLowerCase();
          const hasUserFilter = userCityFilter.trim().length > 0;
          const hasValidDetectedLocation =
            locationStatus === "allowed" &&
            city &&
            city !== "Detecting..." &&
            city !== "Unknown" &&
            !city.toLowerCase().includes("location") &&
            !city.toLowerCase().includes("error");

          const shouldShowAllRequests =
            (!hasUserFilter &&
              (locationStatus === "denied" ||
                locationStatus === "error" ||
                locationStatus === "not_supported")) ||
            (!hasUserFilter && !hasValidDetectedLocation && !normalizedCity);

          // Filter orphanages by city
          const cityFilteredOrphanages = {};
          Object.entries(orphanagesData).forEach(([id, data]) => {
            if (shouldShowAllRequests) {
              cityFilteredOrphanages[id] = data;
            } else if (hasUserFilter || hasValidDetectedLocation) {
              const cityMatch = (data.city || "").trim().toLowerCase();
              if (cityMatch === normalizedCity) {
                cityFilteredOrphanages[id] = data;
              }
            }
          });

          const requestPromises = querySnapshot.docs.map(async (docSnap) => {
            try {
              const data = docSnap.data();
              const reqId = docSnap.id;
              if (!cityFilteredOrphanages[data.orphanageId]) return null;

              let totalDonated = 0;
              const requestDonations = donationsData[reqId] || [];
              requestDonations.forEach((donation) => {
                if (data.requestType === "Money") {
                  totalDonated += Number(donation.amount || 0);
                } else if (data.requestType === "Clothes") {
                  totalDonated += Number(donation.numClothes || 0);
                } else if (data.requestType === "Food") {
                  totalDonated += Number(donation.numMeals || 0);
                }
              });

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
  }, [
    effectiveCity,
    orphanagesData,
    locationStatus,
    userCityFilter,
    city,
    donationsData,
  ]);

  const canRequestPermissionAgain = async () => {
    if (!navigator.permissions) {
      return true;
    }
    try {
      const permission = await navigator.permissions.query({
        name: "geolocation",
      });
      return permission.state === "prompt";
    } catch (error) {
      console.log("Permission API error:", error.message);
      return true;
    }
  };

  const handleRetryLocation = async () => {
    console.log("Retry location clicked, attempt:", retryCount + 1);
    const canRequest = await canRequestPermissionAgain();
    if (!canRequest && locationStatus === "denied") {
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

    setShowLocationPrompt(false);
    setLocationError("");
    setTimeout(() => {
      detectLocation(true, false);
    }, 500);
  };

  const getLocationDisplayText = () => {
    if (userCityFilter.trim()) {
      return userCityFilter.trim();
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
      {children({
        cityFilteredRequests,
        loading,
        city,
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
      })}
    </>
  );
}
