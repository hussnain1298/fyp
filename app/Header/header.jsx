"use client";

import Link from "next/link";

export default function Header({ dropdownItems }) {
  return (
    <div className="hidden md:flex w-full border-t border-transparent bg-[rgb(239,239,239)] mt-14 ">
      <div className="max-w-[1480px] mx-auto px-4 py-2 flex justify-center items-center flex-wrap gap-6 ">
        {dropdownItems.map((item, index) => (
          <div key={item.name} className="flex items-center gap-8">
            <Link
              href={item.link}
              className="text-black text-base hover:text-yellow-600 transition-colors"
            >
              {item.name}
            </Link>
            {index < dropdownItems.length - 1 && (
              <div className="h-4 w-px bg-gray-300" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
