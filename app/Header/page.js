import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const Header = () => {
  return (
    <nav className=" bg-transparent  mt-[85px]  w-full m-auto">
      <div className="container mx-auto px-20 hidden md:flex items-center justify-between py-2 font-semibold lg:text-base xl:text-lg ">
        <Link
          href="../Services"
          className="  hover:text-red-700 transition duration-300"
        >
          Services
        </Link>
        <Separator
          orientation="vertical"
          className="mx-2 border-l-2 border-gray-200 h-6" // Adjust height, border, and color
        />

        <Link
          href="../whoweare"
          className="  hover:text-green-700 transition duration-300"
        >
          About Us
        </Link>
        <Separator
          orientation="vertical"
          className="mx-2 border-l-2 border-gray-200 h-6" // Adjust height, border, and color
        />

        <Link
          href="../Orphanages"
          className=" hover:text-red-700 transition duration-300"
        >
          Our Orphanages
        </Link>
        <Separator
          orientation="vertical"
          className="mx-2 border-l-2 border-gray-200 h-6" // Adjust height, border, and color
        />

        <Link
          href="/collection"
          className="  hover:text-teal-500 transition duration-300"
        >
          Our Donors
        </Link>
        <Separator
          orientation="vertical"
          className="mx-2 border-l-2 border-gray-200 h-6" // Adjust height, border, and color
        />
        <Link
          href="/lookbook"
          className="  hover:text-teal-500 transition duration-300"
        >
          LOOKBOOK
        </Link>
      </div>
    </nav>
  );
};

export default Header;
