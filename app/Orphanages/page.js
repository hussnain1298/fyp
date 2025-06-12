"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";
import OurOrphanages from "./OurOrphanages";
import Navbar from "../Navbar/navbar";
import Footer from "../footer/page";
import Nav from "../Navbar/page";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function Orphanages() {
  return (
    <div className={`${poppins.className} flex flex-col min-h-screen`}>
      <Navbar />
      <main className="flex-grow">
        <OurOrphanages />
      </main>
      <Footer />
    </div>
  );
}
