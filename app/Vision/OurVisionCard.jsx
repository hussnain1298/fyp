import React from "react";

export default function OurVisionCard({
  bgImg,
  title,
  description,
  btnText,
  color,
}) {
  return (
    <div
      className="relative rounded-md shadow-md flex items-end pl-8 overflow-hidden group w-[320px] min-h-[220px] md:w-[350px] md:min-h-[250px] lg:w-[370px]  xl:min-h-[260px]"
      style={{
        backgroundImage: `url('${bgImg}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100%",
      }}
    >
      <div
        className={`absolute inset-0 bg-${color}-600 opacity-60 transition-opacity duration-300 group-hover:opacity-80`}
      ></div>
      <div className=" h-100% flex flex-col justify-between">
        <h1 className="absolute z-10 text-white text-xl font-bold mb-2 transition-all duration-300 group-hover:translate-y-[-150%] md:text-xl lg:text-2xl xl:text-3xl">
          {title}
          <hr className="w-[50%] mt-2 border-t-2 border-white" />
        </h1>
        <div className="relative opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-[-10%] text-white">
          <p className="mt-2 text-white text-sm md:text-base lg-text-lg">
            {description}
          </p>
          <button className="mt-4 px-5 py-2 border border-white rounded-md hover:bg-white uppercase hover:text-black transition text-sm md:text-base lg-text-lg">
            {btnText}
          </button>
        </div>
      </div>
    </div>
  );
}
