"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Poppins } from "next/font/google";

import MyAccount from "./myAccount";


// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});


export default function DonorDashboards() {
  return (
    <div>
<MyAccount/>

  </div>
  )
  
}
