import React from "react";
import OurVisionCard from "./OurVisionCard";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
export default function OurVision() {
  return (
    <div className={`${poppins.className} mt-24`}>
      <h2 className="text-2xl font-bold text-gray-800 text-center md:text-3xl lg:text-4xl xl:text-5xl">
        OUR VISION
      </h2>
      <p className=" text-sm  text-gray-500 mt-4 text-center w-[80%] m-auto md:w-[70%] md:text-base lg:text-lg xl:text-xl">
        Our vision is to build a community of empowered orphans and individuals
        who can rise above their challenges and contribute meaningfully to
        society. By providing education, skills, and opportunities, we aim to
        transform lives and foster resilience, compassion, and self-sufficiency.
        Together, we strive to create a world where everyone, regardless of
        their background, can thrive and make a positive impact on humanity.
        This is our commitment to hope, equality, and collective progress.
      </p>
      <div className="flex flex-wrap justify-center max-w-[90%] m-auto mt-28  gap-10 md:w-[80%]">
        <OurVisionCard
          bgImg="/ak2.jpg"
          title="Orphan Care"
          description="We envision a world where everyone has access to quality healthcare. We are on a mission to provide free healthcare services to the underprivileged. "
          btnText="Our Seven Pillars"
        />
        <OurVisionCard
          bgImg="/ak.jpg"
          title="Orphan Education"
          description="We envision a world where everyone has access to quality healthcare. We are on a mission to provide free healthcare services to the underprivileged."
          btnText="What We Do"
        />
        <OurVisionCard
          bgImg="/ak3.jpg"
          title="Community Building"
          description="We envision a world where everyone has access to quality healthcare. We are on a mission to provide free healthcare services to the underprivileged."
          btnText="Our Programs"
        />
      </div>
    </div>
  );
}
