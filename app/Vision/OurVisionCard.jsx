"use client";

import Image from "next/image";

export default function OurVisionCard({ bgImg, title, description, btnText }) {
  return (
    <div className="w-full sm:w-[300px] md:w-[320px] lg:w-[340px] xl:w-[360px] flex flex-col shadow-md rounded-lg overflow-hidden transition-all duration-300 hover:scale-105">
      <div className="relative w-full h-64"> {/* Increased height */}
        <Image
          src={bgImg}
          alt={title}
          layout="fill"
          objectFit="cover"
          priority
          quality={70}
          className="rounded-t-lg"
        />
      </div>
      <div className="p-4 bg-white flex flex-col justify-between flex-1">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <button className="text-green-600 hover:text-green-800 font-medium text-sm">
          {btnText}
        </button>
      </div>
    </div>
  );
}
