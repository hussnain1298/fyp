import React from "react";
import Orphanages from "./Orphanages";

export default function OurOrphanages() {
  return (
    <div className="w-[80%] m-auto mt-24">
      <h1 className="capitalize text-4xl font-semibold mb-16 underline">
        Our orphanages
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Orphanages
          logo="https://donate.edhi.org/wp-content/uploads/2021/11/logo-2.png"
          orgName="Edhi Foundation"
          location="C3GF+FV9, Liaqat Rd, Faisalabad, Punjab"
          orgLink="https://donate.edhi.org/"
        />
        <Orphanages
          logo="https://alkhidmat.org/images/logo-nav.svg"
          orgName="Al Khidmat Foundation"
          location="Headoffice, 3km Khayaban-e-Jinnah, Lahore"
          orgLink="https://donate.edhi.org/"
        />
        <Orphanages
          logo="https://www.worldcarefoundation.org/wp-content/uploads/2022/07/WCF-Logo-White-Text.png"
          orgName="Agosh Orphanage"
          location="17A Haddington Place Edinburgh EH7 4AF"
          orgLink="https://donate.edhi.org/"
        />
      </div>
    </div>
  );
}
{
  /* <img
  width="800"
  height="211"
  src=""
  class="attachment-full size-full wp-image-51090"
  alt=""
  srcset="https://www.worldcarefoundation.org/wp-content/uploads/2022/07/WCF-Logo-White-Text.png 800w, https://www.worldcarefoundation.org/wp-content/uploads/2022/07/WCF-Logo-White-Text-300x79.png 300w, https://www.worldcarefoundation.org/wp-content/uploads/2022/07/WCF-Logo-White-Text-768x203.png 768w, https://www.worldcarefoundation.org/wp-content/uploads/2022/07/WCF-Logo-White-Text-705x186.png 705w, https://www.worldcarefoundation.org/wp-content/uploads/2022/07/WCF-Logo-White-Text-600x158.png 600w"
  sizes="(max-width: 800px) 100vw, 800px"
></img>; */
}
