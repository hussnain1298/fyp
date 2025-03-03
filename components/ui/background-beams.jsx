"use client";
import React, { useState, useEffect } from "react"; // <-- Add this import
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = React.memo(({ className }) => {
  const paths = [
    "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
    "M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
    // ... Add other paths here
  ];

  // State to store paths with randomized gradient values
  const [pathsWithRandomValues, setPathsWithRandomValues] = useState([]);

  useEffect(() => {
    const randomizedPaths = paths.map((path) => ({
      path,
      gradientEnd: `${93 + Math.random() * 8}%`, // Randomized gradient value
    }));
    setPathsWithRandomValues(randomizedPaths);
  }, []);

  return (
    <div
      className={cn(
        "absolute h-full w-full inset-0 [mask-size:40px] [mask-repeat:no-repeat] flex items-center justify-center",
        className
      )}
    >
      <svg
        className="z-0 h-full w-full pointer-events-none absolute"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {pathsWithRandomValues.map((item, index) => (
          <motion.path
            key={`path-${index}`}
            d={item.path}
            stroke={`url(#linearGradient-${index})`}
            strokeOpacity="0.4"
            strokeWidth="0.5"
          />
        ))}

        <defs>
          {pathsWithRandomValues.map((item, index) => (
            <motion.linearGradient
              id={`linearGradient-${index}`}
              key={`gradient-${index}`}
              initial={{
                x1: "0%",
                x2: "0%",
                y1: "0%",
                y2: "0%",
              }}
              animate={{
                x1: ["0%", "100%"],
                x2: ["0%", "95%"],
                y1: ["0%", "100%"],
                y2: ["0%", item.gradientEnd],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                ease: "easeInOut",
                repeat: Infinity,
                delay: Math.random() * 10,
              }}
            >
              <stop stopColor="#18CCFC" stopOpacity="0"></stop>
              <stop stopColor="#18CCFC"></stop>
              <stop offset="32.5%" stopColor="#6344F5"></stop>
              <stop offset="100%" stopColor="#AE48FF" stopOpacity="0"></stop>
            </motion.linearGradient>
          ))}

          <radialGradient
            id="paint0_radial_242_278"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)"
          >
            <stop offset="0.0666667" stopColor="var(--neutral-300)"></stop>
            <stop offset="0.243243" stopColor="var(--neutral-300)"></stop>
            <stop offset="0.43594" stopColor="white" stopOpacity="0"></stop>
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});

BackgroundBeams.displayName = "BackgroundBeams";
