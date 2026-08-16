import "../styles/globals.css";
import Navbar from "@/components/Navbar";
export const metadata = { title: "LUMINA — Facial Analysis", description: "Camera-based facial landmark and proportion analysis." };
export default function RootLayout({ children }) { return <html lang="en"><body><div className="min-h-screen bg-[#080812] bg-[radial-gradient(circle_at_15%_10%,rgba(217,70,239,.16),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,.12),transparent_35%)]"><div className="max-w-6xl mx-auto px-4 py-4"><Navbar/><main>{children}</main></div></div></body></html>; }
