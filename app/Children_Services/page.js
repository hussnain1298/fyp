

"use client";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Child() {
  return (
    <section className="container mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
      {/* Left Section - Main Content */}
      <div className="lg:w-4/5 bg-white shadow-md rounded-lg p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Children Services</h2>

        {/* Static Section */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold">Free Consultancy Clinic</h3>
          <motion.div 
            className="mt-4 text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p>
              The history of establishing the Edhi child adoption centre and childcare services dates back to 1949. 
              Mrs. Bilquis Edhi is supervising and looking after the caring and feeding of babies and children.
            </p>
            <p className="mt-2">
              Exclusive cradles have been placed outside all Edhi Centres across the country to keep abandoned 
              and illegitimate babies safe. 
            </p>
            <p className="mt-2">
              On an annual basis, the Edhi Foundation is giving over <strong>250 babies</strong> or children for adoption. 
              To date, over <strong>23,320 babies</strong> and children have been provided to childless couples and families.
            </p>
          </motion.div>
        </div>

        {/* Image - Square Shape */}
        <div className="relative w-64 h-64 mt-6 mx-auto rounded-lg overflow-hidden">
          <Image
            src="/education.jpg" // Replace with your actual image path
            alt="Children Services"
            width={256}
            height={256}
            className="w-full h-full object-cover rounded-lg shadow-md"
          />
        </div>
      </div>

      {/* Right Section - Sidebar (Reduced Size) */}
      <aside className="lg:w-1/5 bg-gray-100 shadow-md rounded-lg p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">OUR SERVICES</h3>
        <ul className="space-y-2">
          {[
            "Donation Services",
            "Educational Services",
            "Children Services",
            "Food",
            "Clothes",
            "Orphanage Centres",
          ].map((service, index) => (
            <li key={index} className={`text-sm ${index % 2 === 0 ? "text-gray-600" : "text-red-500"}`}>
              • {service}
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
