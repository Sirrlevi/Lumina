"use client";
import AuthGate from "@/components/AuthGate";
import UploadForm from "@/components/UploadForm";
export default function UploadPage(){return <AuthGate><div className="max-w-4xl mx-auto"><div className="mb-6"><p className="eyebrow">LUMINA ANALYZER</p><h1 className="text-3xl sm:text-4xl font-black mt-2">Measure. Map. Improve.</h1><p className="text-white/50 mt-2 max-w-2xl">Camera-only facial landmark scanning with an on-screen structure map. No image upload and no local engine dependency.</p></div><UploadForm/></div></AuthGate>}
