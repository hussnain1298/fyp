"use client";

import React from "react";
import Image from "next/image";
import { Poppins } from "next/font/google";
import Navbar from "../Navbar/page";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function WhoWeAre() {
  return (
    <section className={`${poppins.className} bg-gray-50 py-16`}>
      <Navbar />
      <div className="container mx-auto px-6 lg:flex lg:items-center lg:space-x-10 mt-20 ">
        {/* Left Section - Text Content */}
        <div className="flex-1 bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b-4 border-red-500 inline-block">
            Who We Are?
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Blood Buddies is a public donation center with blood donation
            members in the changing health care system.
          </p>
          <ul className="list-disc list-inside space-y-4 text-gray-600">
            <li>
              <span className="text-red-500"></span> Specialist blood donors and
              clinical supervision.
            </li>
            <li>
              <span className="text-red-500"></span> Increasing communication
              with our members.
            </li>
            <li>
              <span className="text-red-500"></span> High-quality assessment,
              diagnosis, and treatment.
            </li>
            <li>
              <span className="text-red-500"></span> Examine critically to
              ensure alignment.
            </li>
            <li>
              <span className="text-red-500"></span> The extra care of a
              multi-disciplinary team.
            </li>
          </ul>
        </div>

        {/* Right Section - Image */}
        <div className="flex-1 mt-10 lg:mt-0">
          <Image
            src="/tech.png" // Replace with the correct image path
            alt="Who We Are"
            className="rounded-lg shadow-lg"
            width={600}
            height={400}
          />
        </div>
      </div>
    </section>
  );
}
