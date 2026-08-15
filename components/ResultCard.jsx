export default function ResultCard({data}){
  if(!data) return null;
  return (
    <div className="glass p-6 space-y-4">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">{data.tier}</h2>
        <span className="text-4xl font-black text-cyan-300">{data.numeric}/10</span>
      </div>
      <p>Symmetry: {data.symmetry}/10 • Shape: {data.shape}</p>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(data.breakdown).map(([k,v])=>(
          <div key={k} className="bg-black/30 p-3 rounded-lg capitalize">{k}: {v}</div>
        ))}
      </div>
    </div>
  );
}
