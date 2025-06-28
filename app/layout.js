import { Poppins, Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// Load fonts
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

// ✅ Use a local icon path from /public
export const metadata = {
  title: "CareConnect",
  description: "Connecting donors and orphanages",
  icons: {
    icon: "/favicon.png", // or "/favicon.png" — must be in public/
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} ${robotoMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
