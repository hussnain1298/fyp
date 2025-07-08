"use client";

import Header from "./header.jsx";

const dropdownItems = [

 { name: "Our Donors", link: "/Donors" },
  { name: "Our Orphanages", link: "/Orphanages" },
   { name: "Gallery", link: "/gallery" },
   { name: "About Us", link: "/whoweare" },
 
];

export default function LowerHeader() {
  return (
    <div>
      <Header dropdownItems={dropdownItems} />
    </div>
  );
}
