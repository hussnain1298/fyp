"use client";
import Image from "next/image";
import Link from "next/link"; // Import Next.js Link
import { Poppins } from "next/font/google";
import Navbar from "../Navbar/page";

export default function Services() {
  const services = [
    {
      title: "Donation Services",
      image: "/hand.jpg", // Replace with actual image path
      link: "/donation", // Add a placeholder link
    },
    {
      title: "Educational Services",
      image: "/education.jpg", // Replace with actual image path
      link: "./Educational_Services", // Link to test.jsx
    },
    {
      title: "Children Services",
      image: "/takecare.jpg", // Replace with actual image path
      link: "./Children_Services", // Add a placeholder link
    },
    {
      title: "Food Services",
      image: "/food2.jpeg", // Replace with actual image path
      link: "/food", // Add a placeholder link
    },
    {
      title: "Clothes",
      image: "/clothes.jpg", // Replace with actual image path
      link: "/clothes", // Add a placeholder link
    },
    {
      title: "Orphanage Centres",
      image: "/hand.jpg", // Replace with actual image path
      link: "/orphanage", // Add a placeholder link
    },
  ];

  return (
    <section className="py-12 ">
      <Navbar />
      <div className="container mx-auto text-center mt-24">
        <h2 className="text-4xl font-bold text-gray-800 text-center">
          OUR SERVICES
        </h2>
        <p className="text-gray-500 mt-2 text-xl">
          Serving Humanity is the Spirit of All Religions
        </p>
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-6 px-4">
        {services.map((service, index) => (
          <div
            key={index}
            className="w-48 h-64 rounded-lg overflow-hidden shadow-md relative group"
          >
            {/* Full Image Card */}
            <Image
              src={service.image}
              alt={service.title}
              width={500}
              height={300}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay for Title */}
            <div className="absolute inset-0 flex flex-col justify-end bg-black bg-opacity-50 text-white p-4 transition-opacity duration-300 group-hover:bg-opacity-70">
              <h3 className="text-sm font-semibold text-center">
                {service.title}
              </h3>

              {/* Hidden Read More Button (Appears on Hover) */}
              <Link href={service.link}>
                <button className="bg-transparent text-red-500 py-2 ml-8 px-4 rounded-lg text-xs font-semibold shadow-md hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-50 mt-2">
                  READ MORE
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
      <hr
        className="my-12 h-px border-t-0 bg-transparent bg-gradient-to-r 
      from-transparent via-neutral-500 to-transparent opacity-25 dark:via-neutral-400"
      />
    </section>
  );
}
