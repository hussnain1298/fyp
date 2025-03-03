"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaShoppingCart } from "react-icons/fa";

export default function DonationButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Donation Icon Button (Floating on Bottom Right) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition flex items-center justify-center"
      >
        <FaShoppingCart size={24} />
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed top-0 right-0 w-80 h-full bg-white shadow-lg p-6 z-50"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3 }}
          >
            {/* Close Button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Donation List</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Empty Cart Message */}
            <div className="flex flex-col items-center justify-center h-full">
              <FaShoppingCart size={50} className="text-gray-400" />
              <p className="text-gray-500 mt-2">No Donations in the Cart.</p>
              <button
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
                onClick={() => setIsOpen(false)}
              >
                Return to Shop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

