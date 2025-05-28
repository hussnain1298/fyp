import React from "react";
import { useRouter } from "next/navigation";
import { firestore, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import withAuth from "@/lib/withAuth";

export default function FundRaiserCard({
  id,
  bgImage,
  title,
  description,
  raisedAmount,
  totalAmount,
  filledhr,
  orphanageName, // new prop
}) {
  const router = useRouter();

  const checkDonorAccess = async () => {
    try {
      await withAuth(); // Ensure user is logged in

      const userRef = doc(firestore, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      const user = userSnap.data();

      if (user?.userType !== "Donor") {
        alert("Only donors are allowed to donate.");
        return;
      }

      router.push(`/fund-donation?fundraiserId=${id}`);
    } catch {
      alert("Please log in to continue.");
    }
  };

  return (
    <div className="w-full sm:w-[340px] bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out">
      <div className="relative h-64 overflow-hidden rounded-t-3xl shadow-inner">
        {/* Increased image height to h-64 */}
        <img
          src={bgImage}
          alt={title}
          className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-300 ease-in-out"
          loading="lazy"
        />
      </div>

      <div className="p-6 flex flex-col gap-3">
        <h2 className="text-2xl font-extrabold text-gray-900 line-clamp-2">{title}</h2>

       

        <p className="text-sm text-gray-600 line-clamp-3">{description}</p>
 {orphanageName && (
          <p className="text-sm font-semibold text-gray-500">ORPHANAGE:  <span className="font-thin">{orphanageName}</span> </p>
        )}
        <div className="w-full h-3 bg-gray-300 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-700 transition-width duration-500 ease-in-out"
            style={{ width: `${filledhr}%` }}
          />
        </div>

        <div className="text-sm text-gray-700 font-semibold">
          Raised <span className="text-green-700">Rs. {raisedAmount}</span> of Rs. {totalAmount}
        </div>

        <button
          type="button"
          onClick={checkDonorAccess}
          className="mt-4 w-full py-3 rounded-xl text-white font-semibold bg-green-600 hover:bg-green-700 active:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors duration-200"
        >
          Donate
        </button>
      </div>
    </div>
  );
}
