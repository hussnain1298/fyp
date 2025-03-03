import ContactForm from "./ContactForm";
import ContactInfo from "./ContactInfo";
import Navbar from "../Navbar/page";
import Footer from "../footer/page";
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Navbar />
      <div className="max-w-7xl mx-auto mt-24 ">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-800 sm:text-4xl mt-8">
            Contact Us
          </h2>
          <p className="mt-4 text-xl text-gray-500">
            We'd love to hear from you. Send us a message and we'll respond as
            soon as possible.
          </p>
        </div>
        <div className="mt-12 bg-white shadow-2xl sm:rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-12">
              <ContactForm />
            </div>
            <div className="bg-indigo-50 p-6 sm:p-8 md:p-12">
              <ContactInfo />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
