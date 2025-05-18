"use client";

import { useRouter } from "next/navigation";
import Navbar from "../Navbar/page";
import Sections from "./sections";
import AboutSection from "./aboutsection";
import ExploreCourses from "./exploreCourses";
import Footer from "../footer/page";

export default function Page() {
  const router = useRouter();

  const goToQuizPage = () => {
    router.push("/Educational_Services/webQuiz");
  };

  return (
    <div className="ml-20 mr-20">
      <Navbar />
      <Sections />
      <hr className="my-12 h-px bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-25" />

      <ExploreCourses />

      <div className="flex justify-center mt-6">
        <button
          onClick={goToQuizPage}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Take a Quiz
        </button>
      </div>

      <hr className="my-12 h-px bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-25" />

      <AboutSection />
      <Footer />
    </div>
  );
}
