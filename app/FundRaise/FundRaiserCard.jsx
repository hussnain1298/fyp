import React from "react";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});


export default function FundRaiserCard({
  bgImage,
  title,
  description,
  raisedAmount,
  totalAmount,
  filledhr,
}) {
  return (
    <div className="min-w-[370px]  h-[100px] min-h-[500px] bg-white flex flex-col justify-between rounded-sm shadow-xl">
      <img src={bgImage} alt="" className="w-[100%] h-1/2 rounded-t-sm" />
      <div className="text-black h-1/2 flex flex-col gap-6 justify-center px-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-md text-gray-600">{description}</p>
        <div className="relative w-full">
          <hr className="w-full border-t-2 border-gray-300" />
          <hr
            className={`absolute top-0 left-0 ${filledhr} border-t-2 border-red-500`}
          />
        </div>
        <div>
          <p>
            Raised: <strong>Rs. {raisedAmount}</strong> of Rs. {totalAmount}
          </p>
        </div>
      </div>
    </div>
  );
}
