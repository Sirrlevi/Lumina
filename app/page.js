import Link from "next/link";
export default function Home(){ return (<div className="text-center mt-20"><h1 className="text-5xl font-bold mb-4">AI Looksmaxxing Coach</h1><p className="text-white/70 mb-8">Upload a photo or use live camera → get rating → personalized plan</p><Link href="/dashboard/upload" className="btn-neon">Start Analysis</Link></div>); }
