'use client';
import React, { useState, useEffect } from "react";
import { firestore } from "@/lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import FundRaiserCard from "./FundRaiserCard";

const FundRaising = () => {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFundraisers = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetching from fundraisers collection
        const q = query(collection(firestore, "fundraisers"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("");
          return;
        }

        const fundraiserList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFundraisers(fundraiserList); // Update state with fetched fundraisers
      } catch (err) {
        setError("Failed to load fundraisers: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFundraisers();
  }, []); // Fetch fundraisers once when the component mounts

  return (
    <div className="bg-gray-50 w-full h-[100%]">
      <div className="text-center py-32 flex flex-col w-4/5 m-auto">
        <h2 className="text-4xl font-bold text-gray-800 text-center pb-6">
          Fund Raising
        </h2>
        <p className="text-xl text-gray-500 mt-2 text-center mt-18 w-[80%] m-auto md:w-[70%] lg:text-xl">
          Your support can bring hope and change to those in need...
        </p>
      </div>

      {/* Error Handling */}
      {error && (
        <div className=" text-black text-center py-4">{error}</div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <div className="flex w-[98%] m-auto gap-8 pb-32 px-5 overflow-auto scrollbar-hide">
          {fundraisers.length === 0 ? (
            <p className="text-center text-xl text-gray-500">No fundraisers found.</p>
            
          ) : (
            fundraisers.map((fundraiser) => (
              <FundRaiserCard
                key={fundraiser.id}
                bgImage={fundraiser.image || "/hands.jpg"} // Default image if no image provided
                title={fundraiser.title}
                description={fundraiser.description}
                raisedAmount={fundraiser.raisedAmount || "0"} // Default to 0 if not provided
                totalAmount={fundraiser.totalAmount || "0"} // Default to 0 if not provided
              // Assuming filledhr is a percentage string
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FundRaising;
