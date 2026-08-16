const clamp=(v,min=1,max=10)=>Math.max(min,Math.min(max,Number(v)||min));
const round=(v,d=1)=>Number(Number(v).toFixed(d));
const bands=[[3.5,"Sub-5"],[5,"LTN"],[6.2,"MTN"],[7.3,"HTN"],[8.3,"Chadlite"],[9.1,"Chad"],[10.01,"Adam"]];
const tier=s=>{for(const [m,t] of bands)if(s<m)return t;return"Adam"};
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967295}
export function applyAdminOverride(data,o,seed=""){
 if(!o?.enabled)return data;const target=clamp(o.overallRating),src=data||{},base=src.breakdown||src.geometryBreakdown||{},b={};
 Object.keys(base).filter(k=>Number.isFinite(Number(base[k]))).forEach(k=>{b[k]=round(clamp(target+(hash(`${seed}:${k}:${target}`)-.5)*.6));});
 const sorted=Object.entries(b).sort((a,c)=>a[1]-c[1]);
 return {...src,numeric:round(target),tier:tier(target),breakdown:b,geometryBreakdown:b,aiFeatures:b,
 strengths:sorted.slice(-4).reverse().map(([k,v])=>`${k} (${v}/10)`),priorities:sorted.slice(0,4).map(([k,v])=>`${k} (${v}/10)`),
 confidence:round(Math.max(Number(src.confidence)||0,Math.min(.98,.88+target*.01)),2),
 summary:`Custom LUMINA result · ${src.shape||"Detected"} face with a ${tier(target)}-tier presentation.`,
 adminOverrideApplied:true,adminOverrideRating:round(target),originalNumeric:Number(src.numeric)||null};
}
