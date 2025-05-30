"use client";
import React from "react";
import Image from "next/image";
import DonationButton from "../donation-button/page";

import { IoPlayCircleOutline } from "react-icons/io5";


export default function HeroSection() {
  return (
    <div className=" relative">
      <div className="relative w-full h-screen" id="herosection">
      <Image
  src="/hero.jpg"
  alt="Hero Background"
  fill
  style={{ objectFit: "cover" }}
  className="z-[-1]"
/>

        <div className="w-[90%] md:w-[80%] m-auto items-center flex flex-col gap-10 justify-center h-screen text-center z-10 relative">
          <h1 className="font-semibold text-4xl md:text-6xl lg:text-7xl">
            Bring Hope to Their World
          </h1>

          <div>
            <a
              href="https://www.youtube.com/watch?v=ElG5-nXD0B8"
              className="flex items-center gap-2 hover:underline active:scale-95 active:opacity-80 lg:gap-3"
              target="_blank"
            >
              <IoPlayCircleOutline className="text-3xl lg:text-4xl text-green-700" />
              <span className="text-lg lg:text-xl">Watch Video</span>
            </a>
          </div>
           <DonationButton/>
        </div>
      </div>
    </div>
  );
}
