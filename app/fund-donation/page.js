"use client";
import { useSearchParams, useRouter } from "next/navigation";
import FundRaiserForm from "../fund-raise/page";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore, auth } from "@/lib/firebase";

export default function DonatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const fundraiserId = params.get("fundraiserId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fundraiserExists, setFundraiserExists] = useState(false);
  const [isDonor, setIsDonor] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      if (!fundraiserId) {
        setError("No fundraiser specified");
        setLoading(false);
        return;
      }

      try {
        const fundraiserRef = doc(firestore, "fundraisers", fundraiserId);
        const fundraiserSnap = await getDoc(fundraiserRef);
        setFundraiserExists(fundraiserSnap.exists());

        const userRef = doc(firestore, "users", auth.currentUser?.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (!userSnap.exists() || userData.userType !== "Donor") {
          setError("Access denied. Only donors can donate.");
          return;
        }

        setIsDonor(true);
      } catch (err) {
        setError("Verification failed.");
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [fundraiserId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-500">{error}</div>;
  }

  if (!fundraiserExists) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Fundraiser not found</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <FundRaiserForm fundraiserId={fundraiserId} />
    </div>
  );
}
