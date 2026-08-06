import sharp from "sharp";
import { editPlatformImage } from "./image-edit-provider.mjs";

const toolError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const clean = (value, max = 1000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const safeName = (value, fallback = "image") => String(value || fallback).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 80) || fallback;

export const aiImageToolSlugs = new Set([
  "ai-outfit-changer", "ai-id-photo", "ai-professional-headshot", "ai-product-photo",
  "ai-portrait-studio", "ai-smart-cutout", "ai-background-replacer", "ai-image-restorer",
]);

async function imageInput(file) {
  if (!file?.size) throw toolError("IMAGE_REQUIRED", 400);
  if (file.size > 25 * 1024 * 1024) throw toolError("IMAGE_TOO_LARGE", 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(buffer).metadata().catch(() => null);
  if (!metadata?.width || !metadata?.height) throw toolError("IMAGE_INVALID");
  return { buffer, mimeType: file.type || "image/jpeg", name: file.name, width: metadata.width, height: metadata.height };
}

function promptFor(slug, form, hasReference) {
  const detail = clean(form.get("prompt"), 1200);
  const background = clean(form.get("background"), 240) || "clean light neutral studio background";
  const style = clean(form.get("style"), 160) || "natural realistic photography";
  const outfit = clean(form.get("outfit"), 300) || "professional, well-tailored clothing";
  const color = clean(form.get("backgroundColor"), 40) || "white";
  const rules = "Photorealistic commercial-quality result. Preserve the person's identity, facial structure, skin tone and body proportions exactly when a person is present. Do not alter logos, product shape or factual visual details unless explicitly requested. No extra fingers, no warped anatomy, no text, no watermark.";
  const prompts = {
    "ai-outfit-changer": hasReference
      ? `Use image 1 as the person and image 2 as the clothing reference. Replace only the outfit with the clothing from image 2. Preserve identity, pose, hair, hands and background. ${detail}`
      : `Replace only the person's clothing with this outfit: ${outfit}. Preserve identity, pose, hair, hands and background. ${detail}`,
    "ai-id-photo": `Create a compliant formal ID portrait, centered head and shoulders, looking directly at camera, neutral expression, even frontal lighting, natural retouching, ${color} solid background, ${outfit}. Preserve identity exactly. ${detail}`,
    "ai-professional-headshot": `Create a premium professional business headshot for LinkedIn and company profiles. Outfit: ${outfit}. Background: ${background}. Style: ${style}. Natural confident expression, flattering soft studio lighting, realistic skin texture. ${detail}`,
    "ai-product-photo": `Create a polished e-commerce product photograph. Preserve the product's exact shape, color, logo and packaging. Scene/background: ${background}. Style: ${style}. Controlled studio lighting, clean edges, realistic shadow, high detail. ${detail}`,
    "ai-portrait-studio": `Create a premium personal portrait / artistic photo. Style: ${style}. Scene: ${background}. Preserve identity exactly, natural skin texture, professional composition and cinematic lighting. ${detail}`,
    "ai-smart-cutout": `Precisely isolate the main foreground subject. Remove the entire background and replace it with pure #FFFFFF white. Preserve hair strands, semi-transparent edges, fine fur, product edges and internal details. No shadow outside the subject.`,
    "ai-background-replacer": `Replace only the background with: ${background}. Preserve the foreground subject exactly, including face, hair, clothing, product labels and edges. Match perspective, lighting, reflections and contact shadow naturally. ${detail}`,
    "ai-image-restorer": `Restore and enhance this image at high resolution. Remove blur, compression artifacts, noise, scratches and color casts; recover realistic fine detail and improve clarity. Preserve identity and original composition. Do not invent or change factual content. ${detail}`,
  };
  return `${prompts[slug]}\n\nQuality and safety constraints: ${rules}`;
}

async function whiteToTransparent(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < data.length; offset += 4) {
    const whiteness = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const spread = Math.max(data[offset], data[offset + 1], data[offset + 2]) - whiteness;
    if (whiteness > 238 && spread < 18) data[offset + 3] = Math.max(0, Math.round((255 - whiteness) * 15));
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

export async function processAiImageTool(slug, form, fetchImpl = fetch) {
  if (!aiImageToolSlugs.has(slug)) throw toolError("AI_IMAGE_TOOL_NOT_SUPPORTED", 404);
  const files = form.getAll("files").filter((item) => item?.size);
  const primaryFile = form.get("file")?.size ? form.get("file") : files[0];
  const selected = primaryFile ? [primaryFile, ...files.filter((item) => item !== primaryFile)] : files;
  if (!selected.length) throw toolError("IMAGE_REQUIRED", 400);
  const inputs = await Promise.all(selected.slice(0, 3).map(imageInput));
  const purpose = slug === "ai-image-restorer" ? "image_upscaling" : "image_editing";
  const generated = await editPlatformImage({
    purpose,
    images: inputs.map(({ buffer, mimeType }) => ({ buffer, mimeType })),
    prompt: promptFor(slug, form, inputs.length > 1),
    fetchImpl,
  });
  const outputBuffer = slug === "ai-smart-cutout" ? await whiteToTransparent(generated.buffer) : generated.buffer;
  const metadata = await sharp(outputBuffer).metadata();
  return {
    buffer: outputBuffer,
    extension: ".png",
    mimeType: "image/png",
    name: `${safeName(inputs[0].name)}-${slug}.png`,
    output: {
      mode: "ai",
      providerPurpose: purpose,
      width: metadata.width,
      height: metadata.height,
      sourceWidth: inputs[0].width,
      sourceHeight: inputs[0].height,
      referenceImages: inputs.length,
      latencyMs: generated.latencyMs,
      transparentBackground: slug === "ai-smart-cutout",
    },
  };
}
