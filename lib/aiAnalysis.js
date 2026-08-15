export async function analyzeWithAI(canvas, geometry, onProgress) {
  onProgress?.({ step: 5, progress: 84, label: "AI visual assessment" });
  const image = canvas.toDataURL("image/jpeg", 0.68);
  if (image.length > 2500000) throw new Error("The analysis image is too large. Please use a smaller photo.");
  const response = await fetch("/api/ai-analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({image,geometry}) });
  const json = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(json.error || "AI analysis failed. Check the Gemini API configuration.");
  onProgress?.({ step: 5, progress: 93, label: "Combining AI + measurements" });
  return json;
}
