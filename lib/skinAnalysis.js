export async function analyzeSkin(imageBitmap, landmarks) {
  const c = document.createElement("canvas");
  c.width = imageBitmap.width; c.height = imageBitmap.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imageBitmap, 0, 0);
  const xs = landmarks.map(p => p.x * c.width), ys = landmarks.map(p => p.y * c.height);
  const minX = Math.max(0, Math.floor(Math.min(...xs))), maxX = Math.min(c.width, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys))), maxY = Math.min(c.height, Math.ceil(Math.max(...ys)));
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
  const data = ctx.getImageData(minX, minY, w, h).data;
  const gray = []; let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    if (R > 70 && G > 35 && B > 15 && R > G * .8) { r += R; g += G; b += B; count++; }
    gray.push(.299 * R + .587 * G + .114 * B);
  }
  if (!count) return { score: 5, texture: 5, evenness: 5, redness: 5 };
  const avgR = r / count, avgG = g / count;
  const redness = Math.min(10, Math.max(1, (avgR - avgG) / 12));
  const mean = gray.reduce((a, v) => a + v, 0) / gray.length;
  const variance = gray.reduce((a, v) => a + (v - mean) ** 2, 0) / gray.length;
  const texture = Math.max(1, Math.min(10, 11 - variance / 500));
  const evenness = Math.max(1, Math.min(10, 10 - Math.abs(avgR - avgG) / 10));
  const score = texture * .5 + evenness * .3 + (10 - redness) * .2;
  return { score: +score.toFixed(1), texture: +texture.toFixed(1), evenness: +evenness.toFixed(1), redness: +redness.toFixed(1) };
}
