import React from "react";
import Link from "next/link"; // Import the Link component from Next.js
import DonationComponent from "../donation/donation";

export default function SponsorAnOrphan() {
  return (
    <div className="mt-32 w-[100%] h-[350px] bg-[url('/sbg6.jpg')] bg-no-repeat bg-cover bg-center mb-20 transition-transform duration-1000 hover:scale-110 md:h-[400px] lg:h-[450px] xl:h-[500px]">
      <div className="w-[90%] m-auto md:w-[80%] flex flex-col justify-center h-full">
        <div>
          <h1 className="uppercase text-2xl text-white font-bold ml-[10%] md:text-3xl lg-text-4xl xl:text-5xl">
            Sponsor an
            <br /> <span className="text-yellow-500">Orphan</span>
          </h1>
          <p className="uppercase text-white text-base font-semibold ml-[10%] mt-5 md:text-lg lg:text-xl xl:text-2xl">
            Give them an opportunity to have a life.
          </p>
        </div>
        <div className="ml-[10%] text-xl">
          {/* Wrap the button inside the Link component to navigate when clicked */}
          <Link href="/donation">
            {" "}
            {/* Replace "/donate" with your desired page URL */}
            <button
              type="button"
              className="text-white mt-6 rounded-sm bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-300
              font-medium text-center me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 text-sm py-1.5 px-4 md:text-base md:py-2 md:px-5 lg:text-lg lg:py-2.5 lg:px-6 xl:text-xl xl:py-3 xl:px-8"
            >
              Donate
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
