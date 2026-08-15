import "./../styles/globals.css";
import Navbar from "@/components/Navbar";
import { Inter } from "next/font/google";
const inter = Inter({ subsets:["latin"] });

export const metadata = { title:"LUMINA – AI Looksmaxxing Coach", description:"Upload, analyze, improve" };

export default function RootLayout({children}){
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#1a1033] to-[#0a0a12]">
          <Navbar/>
          <main className="max-w-5xl mx-auto p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
