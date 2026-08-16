import crypto from "node:crypto";
export const ADMIN_COOKIE = "lumina_admin_session";
export const MAX_AGE = 60 * 60 * 8;
function secret(){const v=process.env.LUMINA_ADMIN_PASSWORD;if(!v)throw new Error("LUMINA_ADMIN_PASSWORD is not configured.");return crypto.createHash("sha256").update(`lumina-admin:${v}`).digest();}
function sign(p){return crypto.createHmac("sha256",secret()).update(p).digest("hex");}
export function createAdminSession(){const p=`${Date.now()}.${crypto.randomBytes(18).toString("hex")}`;return `${p}.${sign(p)}`;}
export function verifyAdminSession(v){if(!v)return false;const a=String(v).split(".");if(a.length!==3)return false;const p=`${a[0]}.${a[1]}`,age=Date.now()-Number(a[0]);if(!Number.isFinite(age)||age<0||age>MAX_AGE*1000)return false;try{return crypto.timingSafeEqual(Buffer.from(a[2]),Buffer.from(sign(p)));}catch{return false;}}
