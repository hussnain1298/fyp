"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";
import HeroSection from "./HeroSection/page";
import WhyDonatelySection from "./whydonately/page";
import SponsorAnOrphan from "./Sponsor/page";
import Vision from "./Vision/page";
import Footer from "./footer/page";
import DonationRequest from "./DonationRequests/page";
import Services from "./Services/page";
import Fund from "./FundRaise/page";
import Nav from "./Navbar/page";
import LowerHeader from "./Header/page";
import PublicDonationsList from "./public-donation/page";
import ServicesDisplay from "./servicesRequests/page";
export default function Page() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsReady(true), 300); // simulate delay if needed
    return () => clearTimeout(timeout);
  }, []);

  if (!isReady) {
    return null; // or <Loading /> if you want a skeleton or spinner
  }

  return (
    <div>
      <Nav />
      <LowerHeader />
      
      <HeroSection />
      <Vision />
 <DonationRequest />
      <SponsorAnOrphan />
      <ServicesDisplay/>
     
     
      <Services />
      <Fund />
      <WhyDonatelySection />
      <Footer />
    </div>
  );
}
