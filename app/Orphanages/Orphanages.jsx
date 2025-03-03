import React from "react";

export default function ({ logo, orgName, location, orgLink }) {
  return (
    <div className="w-[350px]  m-h-[100%] rounded-md px-4 py-7  shadow-xl border-l-4 mt-12 md:w-[450px]">
      <div className="flex items-center">
        <div className="w-[150px] min-w-[149px] h-[60px] shadow-lg p-3 rounded-lg bg-white ">
          <img src={logo} alt="" className="w-[100%] h-[100%] object-center " />
        </div>
        <h3 className="pl-6 text-2xl ">{orgName}</h3>
      </div>
      <div>
        <p className="pt-6 text-lg ">
          Address : <span className="font-thin text-gray-800">{location}</span>
        </p>
      </div>
      <div className="mt-3">
        <a
          href={orgLink}
          className="text-red-500 text-xl font-medium hover:text-red-600 underline "
          target="_blank"
        >
          Visit now
        </a>
      </div>
    </div>
  );
}
