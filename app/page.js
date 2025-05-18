import React from "react";
import "./globals.css";
import Navbar from "./Navbar/page";
import Header from "./Header/page";
import HeroSection from "./HeroSection/page";
import WhyDonatelySection from "./whydonately/page";
import SponsorAnOrphan from "./Sponsor/page";
import Vision from "./Vision/page";
import Footer from "./footer/page";
import DonationRequest from "./DonationRequests/page";
import Services from "./Services/page";
import Fund from "./FundRaise/page";

const Page = () => {
  return (
    <div>
      <HeroSection />
      <Vision />

      <SponsorAnOrphan />
      <DonationRequest />
      <Services />
      <Fund />
      <WhyDonatelySection />
      <Footer />
    </div>
  );
};

export default Page;
