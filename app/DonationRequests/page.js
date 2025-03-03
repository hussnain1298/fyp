import CardHoverDemo from "./card-hover-demo";

export default function DonationRequest() {
  return (
    <main className="min-h-screen bg-gray-50 text-black mt-10 ">
      <div className="container  px-2">
        <h2 className="text-2xl font-bold text-gray-800 text-center py-12 md:text-3xl lg:text-4xl xl:text-5xl">
          REQUESTS
        </h2>
        <p className="text-gray-500  text-center text-sm md:text-base lg:text-lg xl:text-xl">
          Serving Humanity is the Spirit of All Religions
        </p>
        <CardHoverDemo />
      </div>
    </main>
  );
}
