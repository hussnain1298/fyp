import Image from 'next/image';
import Navbar from "../Navbar/page";
import { Poppins } from "next/font/google";
import Footer from '../footer/page';
// Importing Poppins Font
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export default function Gallery() {
  const images = [
    '/ak.jpg', 
    '/ak.jpg',
    '/ak.jpg',
    '/ak.jpg',
    '/ak.jpg',
    '/ak.jpg',
    '/ak.jpg',
  ];

  return (
    <div className={`${poppins.className} min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pt-14`}>
      {/* Navbar */}
      <Navbar/>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mt-14">OUR GALLERY</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {images.map((src, index) => (
            <div
              key={index}
              className="relative overflow-hidden shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
            >
              <Image
                src={src}
                alt={`Gallery Image ${index + 1}`}
                width={500}
                height={500}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      <Footer/>
    </div>
   
  );
}
