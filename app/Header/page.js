"use client";

import Header from "./header.jsx";

const dropdownItems = [

 { name: "Our Donors", link: "/Donors" },
  { name: "Our Orphanages", link: "/Orphanages" },
  
   { name: "About Us", link: "/whoweare" },
  { name: "Lookbook", link: "/lookbook" },
];

export default function LowerHeader() {
  return (
    <div>
      <Header dropdownItems={dropdownItems} />
    </div>
  );
}
