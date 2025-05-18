"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../Navbar/page";
import Sections from "./sections";
import AboutSection from "./aboutsection";
import ExploreCourses from "./exploreCourses";
import Footer from "../footer/page";

export default function Page() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const goToQuizPage = () => {
    router.push("/Educational_Services/webQuiz");
  };
  const goToCssQuizPage = () => {
    router.push("/Educational_Services/cssQuiz");
  };
  return (
    <div className="ml-20 mr-20">
      <Navbar />
      <Sections />
      <hr className="my-12 h-px bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-25" />

      <ExploreCourses />

      <div className="felx items-center justify-center relative mx-auto px-6 max-w-4xl">
        {/* Trigger Button */}
        <button
          onClick={toggleDropdown}
          className="inline-flex justify-center w-full rounded-md bg-green-500 text-white px-4 py-2 text-sm font-medium hover:bg-green-600 focus:outline-none"
        >
          Evaluate Yourself
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute w-[95%] z-10 mt-1 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              <button
                onClick={goToQuizPage}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Web Quiz
              </button>
              <button
                onClick={goToCssQuizPage}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                CSS Quiz
              </button>
              <button
                onClick={() => alert("Option 3 selected")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Communication Quiz
              </button>
            </div>
          </div>
        )}
      </div>

      <hr className="my-12 h-px bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-25" />

      <AboutSection />
      <Footer />
    </div>
  );
}
