"use client";
import { useState, useEffect } from "react";
import { firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import FundRaiserCard from "./FundRaiserCard";
import { auth } from "@/lib/firebase";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const NextArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors"
    aria-label="Next Slide"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

const PrevArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors"
    aria-label="Previous Slide"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  </button>
);

const FundRaising = () => {
  const [user, setUser] = useState(null);
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [useCarousel, setUseCarousel] = useState(false);

  // Add custom CSS for the slider
  useEffect(() => {
    // Add custom CSS to ensure slider shows full content
    const style = document.createElement("style");
    style.textContent = `
    .slick-track {
      display: flex !important;
    }
    .slick-slide {
      height: inherit !important;
      display: flex !important;
    }
    .slick-slide > div {
      width: 100%;
      display: flex;
      flex-direction: column;
    }
  `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult();
        const role = tokenResult.claims?.userType || null;
        setUser({ uid: currentUser.uid, email: currentUser.email, role });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeFundraisers = null;

    const setupRealTimeListener = async () => {
      setLoading(true);
      setError("");

      try {
        // Get orphanages first
        const orphanQuery = query(
          collection(firestore, "users"),
          where("userType", "==", "Orphanage")
        );
        const orphanSnapshot = await getDocs(orphanQuery);
        const orphanMap = {};
        orphanSnapshot.docs.forEach((doc) => {
          orphanMap[doc.id] = doc.data();
        });

        // Set up real-time listener for fundraisers with error handling
        unsubscribeFundraisers = onSnapshot(
          collection(firestore, "fundraisers"),
          (snapshot) => {
            const fundraiserList = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                orphanageName: orphanMap[data.orphanageId]?.orgName || "",
              };
            });
            setFundraisers(fundraiserList);
            setLoading(false);
          },
          (err) => {
            console.warn("Fundraisers listener error:", err.message);
            // Fallback to one-time fetch if real-time fails
            getDocs(collection(firestore, "fundraisers"))
              .then((snapshot) => {
                const fundraiserList = snapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    ...data,
                    orphanageName: orphanMap[data.orphanageId]?.orgName || "",
                  };
                });
                setFundraisers(fundraiserList);
                setLoading(false);
              })
              .catch((fallbackErr) => {
                setError("Failed to load fundraisers: " + fallbackErr.message);
                setLoading(false);
              });
          }
        );
      } catch (err) {
        console.warn("Setup error:", err.message);
        setError("Failed to setup fundraiser updates: " + err.message);
        setLoading(false);
      }
    };

    setupRealTimeListener();

    // Cleanup function
    return () => {
      if (unsubscribeFundraisers) {
        try {
          unsubscribeFundraisers();
        } catch (cleanupError) {
          console.warn("Cleanup warning:", cleanupError.message);
          // Don't throw error, just log it
        }
      }
    };
  }, []);

  // Check if carousel is needed based on screen size and number of cards
  useEffect(() => {
    const checkCarouselNeed = () => {
      const screenWidth = window.innerWidth;
      let maxCards = 1;

      if (screenWidth >= 1280) maxCards = 4;
      else if (screenWidth >= 1024) maxCards = 3;
      else if (screenWidth >= 640) maxCards = 2;
      else maxCards = 1;

      setUseCarousel(fundraisers.length > maxCards);
    };

    checkCarouselNeed();
    window.addEventListener("resize", checkCarouselNeed);

    return () => window.removeEventListener("resize", checkCarouselNeed);
  }, [fundraisers.length]);

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500 text-lg">
        Loading fundraisers...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-12 text-red-500 text-lg">{error}</div>
    );

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    adaptiveHeight: true, // Enable adaptive height
    variableWidth: false,
    centerMode: false,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: 3,
          autoplay: true,
          autoplaySpeed: 4000,
          adaptiveHeight: true,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          autoplay: true,
          autoplaySpeed: 4000,
          adaptiveHeight: true,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          autoplay: true,
          autoplaySpeed: 4000,
          adaptiveHeight: true,
        },
      },
    ],
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 w-full min-h-screen py-20">
      <div className="text-center w-full mx-auto mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 md:text-4xl lg:text-5xl">
          FUND RAISING
        </h2>
        <p className="text-gray-600 text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed">
          Your support can bring hope and change to those in need. Every
          contribution makes a difference.
        </p>
      </div>

      <div className="w-full px-8">
        {fundraisers.length > 0 ? (
          useCarousel ? (
            // Use carousel when there are too many cards for the screen
            <div
              className="slider-container"
              style={{
                paddingBottom: "4rem",
                height: "auto",
                minHeight: "520px",
              }}
            >
              <Slider {...sliderSettings}>
                {fundraisers.map((fundraiser) => (
                  <div
                    key={fundraiser.id}
                    className="px-3"
                    style={{ height: "auto" }}
                  >
                    <FundRaiserCard
                      id={fundraiser.id}
                      bgImage={fundraiser.image || "/raise.jpg"}
                      title={fundraiser.title}
                      description={fundraiser.description}
                      raisedAmount={fundraiser.raisedAmount || 0}
                      totalAmount={fundraiser.totalAmount || 1}
                      filledhr={Math.min(
                        (Number(fundraiser.raisedAmount) /
                          Number(fundraiser.totalAmount)) *
                          100,
                        100
                      )}
                      orphanageName={fundraiser.orphanageName}
                      user={user}
                    />
                  </div>
                ))}
              </Slider>
            </div>
          ) : (
            // Use normal grid when cards fit on screen
            <div className="flex flex-wrap justify-start gap-8">
              {fundraisers.map((fundraiser) => (
                <div key={fundraiser.id} className="flex-shrink-0 mb-6">
                  <FundRaiserCard
                    id={fundraiser.id}
                    bgImage={fundraiser.image || "/raise.jpg"}
                    title={fundraiser.title}
                    description={fundraiser.description}
                    raisedAmount={fundraiser.raisedAmount || 0}
                    totalAmount={fundraiser.totalAmount || 1}
                    filledhr={Math.min(
                      (Number(fundraiser.raisedAmount) /
                        Number(fundraiser.totalAmount)) *
                        100,
                      100
                    )}
                    orphanageName={fundraiser.orphanageName}
                    user={user}
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-semibold text-gray-600 mb-4">
                No fundraisers available
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Check back later for new fundraising campaigns. New requests
                will appear here automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FundRaising;
