"use client";

import React, { useState, useEffect } from "react";
import Slider from "react-slick";
import { firestore } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import FundRaiserCard from "./FundRaiserCard";
import { auth } from "@/lib/firebase"; // 👈 load user manually
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const NextArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full shadow p-2 hover:bg-gray-100"
    aria-label="Next Slide"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-gray-700"
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
    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full shadow p-2 hover:bg-gray-100"
    aria-label="Previous Slide"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 text-gray-700"
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
    const fetchFundraisers = async () => {
      setLoading(true);
      setError("");
      try {
        const orphanQuery = query(collection(firestore, "users"), where("userType", "==", "Orphanage"));
        const orphanSnapshot = await getDocs(orphanQuery);
        const orphanMap = {};
        orphanSnapshot.docs.forEach(doc => {
          orphanMap[doc.id] = doc.data();
        });

        const fundraiserSnapshot = await getDocs(collection(firestore, "fundraisers"));

        const fundraiserList = fundraiserSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            orphanageName: orphanMap[data.orphanageId]?.orgName || "",
          };
        });

        setFundraisers(fundraiserList);
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFundraisers();
  }, []);

  if (loading)
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  const settings = {
    dots: true,
    infinite: fundraisers.length > 4,
    speed: 600,
    slidesToShow: fundraisers.length >= 4 ? 4 : fundraisers.length,
    slidesToScroll: 1,
    arrows: true,
    autoplay: fundraisers.length > 4,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1280,
        settings: { slidesToShow: Math.min(fundraisers.length, 3) },
      },
      {
        breakpoint: 1024,
        settings: { slidesToShow: Math.min(fundraisers.length, 2) },
      },
      {
        breakpoint: 640,
        settings: { slidesToShow: 1, centerMode: false },
      },
    ],
  };

  return (
    <div className="bg-gray-50 w-full min-h-screen px-4 py-20 relative">
      <div className="text-center max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">
          Fund Raising
        </h2>
        <p className="text-lg sm:text-xl text-gray-500 mt-4">
          Your support can bring hope and change to those in need...
        </p>
      </div>

      <Slider {...settings}>
        {fundraisers.map((fundraiser) => (
          <div key={fundraiser.id} className="px-16">
            <FundRaiserCard
              id={fundraiser.id}
              bgImage={fundraiser.image || "/raise.jpg"}
              title={fundraiser.title}
              description={fundraiser.description}
              raisedAmount={fundraiser.raisedAmount || 0}
              totalAmount={fundraiser.totalAmount || 1}
              filledhr={Math.min(
                (Number(fundraiser.raisedAmount) / Number(fundraiser.totalAmount)) * 100,
                100
              )}
              orphanageName={fundraiser.orphanageName}
              user={user}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default FundRaising;
