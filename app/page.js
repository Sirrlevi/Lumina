import Link from "next/link";

export default function Home(){
 return <div className="max-w-6xl mx-auto py-12 sm:py-20">
  <section className="text-center max-w-4xl mx-auto">
   <p className="eyebrow">FREE FACIAL ANALYSIS</p>
   <h1 className="text-5xl sm:text-7xl font-black tracking-tight mt-3">Know your face.<br/><span className="gradient-text">Know what to improve.</span></h1>
   <p className="text-white/55 text-base sm:text-lg max-w-2xl mx-auto mt-6">A repeatable face-mesh scan that breaks down symmetry, proportions, eyes, jawline, skin quality and more — then turns the weak points into a practical improvement plan.</p>
   <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8"><Link href="/register" className="btn-neon">Start free analysis</Link><Link href="/login" className="rounded-xl px-5 py-3 border border-white/10 bg-white/5">Log in</Link></div>
  </section>
  <section className="grid md:grid-cols-3 gap-4 mt-14">
   {[['01','SCAN','Run a guided front-facing camera scan.'],['02','BREAKDOWN','Get 10+ repeatable facial measurements and a composite score.'],['03','ROADMAP','Turn the lowest-scoring areas into grooming, skincare and lifestyle priorities.']].map(([n,t,d])=><div key={n} className="glass p-6"><span className="text-cyan-300 text-xs tracking-[.25em]">{n}</span><h2 className="font-bold text-xl mt-3">{t}</h2><p className="text-sm text-white/45 mt-2">{d}</p></div>)}
  </section>
 </div>
}
