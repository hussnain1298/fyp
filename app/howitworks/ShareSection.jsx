"use client";
import Image from "next/image";

export default function ShareSection() {
  return (
    <section className="bg-white py-12 sm:py-16 px-4 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <img
          src="/friends.jpg"
          alt="Share with Family and Friends"
          className="w-full h-auto rounded-lg shadow-md"
        />
        <div>
          <p className="text-sm font-semibold text-gray-400 uppercase mb-2">
            Step 02
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 leading-relaxed">
            Share with Family and Friends
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Far far away, behind the word mountains, far from the countries
            Vokalia and Consonantia, there live the blind texts. Separated
            they live in Bookmarksgrove right at the coast of the Semantics, a
            large language ocean.
          </p>
        </div>
      </div>
    </section>
  );
}
