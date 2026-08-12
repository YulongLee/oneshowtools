import sharp from "sharp";
import { editPlatformImage } from "./image-edit-provider.mjs";

const toolError = (code, status = 422) => Object.assign(new Error(code), { code, status });
const clean = (value, max = 1000) => String(value ?? "").replace(/\0/g, "").trim().slice(0, max);
const safeName = (value, fallback = "image") => String(value || fallback).replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9\u4e00-\u9fff_-]+/g, "-").slice(0, 80) || fallback;

export const aiImageToolSlugs = new Set([
  "ai-outfit-changer", "ai-id-photo", "ai-professional-headshot", "ai-product-photo",
  "ai-portrait-studio", "ai-smart-cutout", "ai-background-replacer", "ai-image-restorer",
  "sliding-ancestor-generator",
]);

const ancestorSlug = "sliding-ancestor-generator";

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
  const additionalDirection = detail
    ? `\nOPTIONAL USER DIRECTION (apply only when it does not conflict with the image roles or preservation rules):\n${detail}`
    : "";
  const rules = "Photorealistic commercial-quality result. Preserve the person's identity, facial structure, skin tone and body proportions exactly when a person is present. Do not alter logos, product shape or factual visual details unless explicitly requested. No extra fingers, no warped anatomy, no text, no watermark.";
  const prompts = {
    "ai-outfit-changer": hasReference
      ? `ONE-SHOW-TOOLS / REFERENCE OUTFIT TRANSFER

TASK
Perform a strict two-image virtual try-on. The result must show the person from IMAGE 1 wearing the clothing extracted from IMAGE 2. This is an image edit, not a new portrait and not an image blend.

IMAGE ROLES — NEVER SWAP THEM
1. IMAGE 1 = TARGET PERSON AND TARGET SCENE. This is the only person allowed in the output.
2. IMAGE 2 = CLOTHING REFERENCE ONLY. It may show clothing on another person, on a mannequin, as a flat-lay, or as a product photo. Never transfer the reference person's identity or scene.

LOCK IMAGE 1
Preserve the target person's identity, face, facial geometry, expression, skin tone, hair, body shape and proportions. Preserve the exact pose, head direction, arms, hands, legs, camera angle, crop, composition, background, lighting and image dimensions. Do not beautify, reshape, age, gender-swap or replace the target person. Hair, hands and accessories that overlap the clothing must remain naturally in front of the new garment.

READ IMAGE 2 AS A GARMENT SPECIFICATION
First identify every clearly visible clothing layer intended as the outfit. Capture garment category, construction, silhouette, neckline, collar, sleeves, waistline, hem and length; preserve layering order, color, fabric, texture, pattern, seams, trims, fasteners and distinctive design details. If IMAGE 2 contains a model, mannequin or scene, mentally remove them and use only the garments. Do not copy its face, hair, skin, body, pose, hands, legs, background, lighting, props, jewelry or unrelated accessories. Do not invent unreadable text or logos. Transfer footwear only when it is clearly visible and the target is full-body.

VIRTUAL TRY-ON EDIT
Replace only the original clothing region of IMAGE 1, plus the minimum boundary pixels required for a clean fit. Dress the same target person in the extracted outfit. Reconstruct hidden garment areas conservatively and adapt the garment to IMAGE 1's body, pose and perspective. Produce physically plausible tailoring, drape, folds, tension, occlusion, contact shadows, reflections and lighting. Keep skin boundaries, hair edges, hands and anatomy clean. The clothing design comes from IMAGE 2; the person, pose and scene always come from IMAGE 1.

SUCCESS CHECK BEFORE RETURNING
- Exactly one person: the person from IMAGE 1.
- The original outfit from IMAGE 1 is visibly replaced.
- The new outfit is recognizably the garment from IMAGE 2 in design and color.
- Face, hair, body, pose, hands, crop and background still match IMAGE 1.
- One seamless photorealistic image; no collage, split screen, source thumbnails or before/after layout.
If IMAGE 2 is ambiguous, transfer only the clearly identifiable garments and never substitute its wearer.${additionalDirection}`
      : `ONE-SHOW-TOOLS / TEXT-DIRECTED OUTFIT CHANGE

TASK
Edit only the clothing worn by the person in IMAGE 1. Replace the original outfit with: ${outfit}.

LOCK THE PERSON AND SCENE
Preserve identity, face, expression, skin tone, hair, body shape, body proportions, pose, hands, camera angle, crop, background and lighting. Do not beautify, reshape, age, gender-swap or replace the person.

CLOTHING EDIT
Change only the original clothing region and the minimum boundary pixels needed for a clean fit. Render the requested garment with coherent construction, realistic fabric, tailoring, folds, occlusion, perspective, contact shadows and matching scene lighting. Keep hair, skin, hands and accessories naturally layered around the clothing. Return one seamless photorealistic image of the same person; no collage, text or before/after layout.${additionalDirection}`,
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

const powerStages = [
  "extremely fragile: clearly narrower shoulders and slimmer upper body, timid slightly collapsed posture, very soft facial tension, low contrast and almost no intimidating presence",
  "very fragile: narrow shoulders, slight build, reserved posture, gentle expression, soft light and visibly weak presence",
  "fragile: modestly slimmer than the source, slightly rounded shoulders, softer jaw definition and subdued presence",
  "slightly fragile: a small reduction in shoulder width and physique, relaxed posture, soft features and restrained contrast",
  "near neutral but subtly weak: almost the original physique, only slightly slimmer and less assertive, calm posture and natural soft light",
  "near neutral but subtly strong: almost the original physique, slightly broader shoulders, firmer posture, a more focused expression and mildly stronger contrast",
  "athletic: visibly broader shoulders, denser athletic build, upright confident posture, firmer jaw definition and stronger screen presence",
  "strong: muscular upper body, broad shoulders, rugged facial definition, confident posture, harder cinematic light and clear physical power",
  "very formidable: heavily muscular but anatomically coherent build, very broad shoulders, intense expression, commanding posture and dramatic contrast",
  "maximum exaggerated powerful form: massive boss-level physique, extremely broad shoulders, powerful neck and upper body, rugged facial definition, dominant posture and intense dramatic light while remaining the same recognizable person",
];

function ancestorStagePrompt(stage, style) {
  const styleMap = {
    realistic: "realistic contemporary portrait evolution, restrained commercial photography, natural textures and a believable gradual physical change",
    cinematic: "rugged cinematic character evolution, harder directional lighting, realistic skin texture and an increasingly powerful screen presence",
    chaos: "surreal internet-meme power evolution, deliberately exaggerated but visually polished, strange high-energy details without changing identity",
  };
  const stageDescription = powerStages[stage - 1];
  return `ONE-SHOW-TOOLS / SLIDING SAME-PERSON POWER PROGRESSION

Create STAGE ${stage} OF 10 in a fictional entertainment-only progression of the uploaded person's physical form and presence. The Chinese meme word "变祖" means "becoming stronger / more formidable" in this product. It does NOT mean becoming an ancestor.

GLOBAL ORDER CONTRACT — THIS IS MANDATORY
The ten outputs form one strictly ordered series from weakest to strongest. Stage 1 is the weakest, Stage 5 is just below the uploaded source, Stage 6 is just above the uploaded source, and Stage 10 is the strongest. This frame must be unmistakably stronger and more imposing than every lower-numbered stage, and unmistakably weaker and less imposing than every higher-numbered stage. Do not collapse adjacent stages into the same appearance.

EXACT TARGET FOR THIS FRAME
Stage ${stage}/10: ${stageDescription}.

NON-ANCESTRY RULE
The output must not depict ancestry, an old ancestor, an emperor, a clan founder, a historical person, a deity, a king, a ceremonial portrait, a family lineage, ethnicity or bloodline. Do not add crowns, imperial robes, ancestral halls, tablets, genealogy motifs or historical regalia unless such items already exist in the uploaded photo.

IDENTITY LOCK
This is the SAME PERSON at a different fictional power level. Preserve facial identity, recognizability, approximate age, hairstyle, skin tone, gaze, camera angle, crop, background, clothing category and overall composition. Keep exactly one person. Do not face-swap, age into an elderly person, change gender, change ethnicity, replace the subject, or turn the result into a different character. Clothing should remain recognizably continuous and may only adapt minimally to the changed physique.

CONTINUITY
The frame must look like one ordered stage in a continuous 10-frame slider. The only progressive dimensions are shoulder width, upper-body density, muscular definition, posture confidence, facial hardness, lighting contrast and perceived presence. Preserve the original head position, framing, background geometry, clothing identity, colors and camera perspective so the ten frames align when crossfaded. Do not make an unrelated scene or redesign the outfit/background.

ART DIRECTION
${styleMap[style] || styleMap.realistic}.
Use the uploaded image's portrait composition. Keep anatomy coherent and the face clearly visible. At stronger levels, emphasize broader physique, harder expression, sharper contrast and commanding presence. At weaker levels, emphasize a slighter physique, softer posture, lower contrast and reduced presence. Never imply that physical strength determines real human value.

FINAL SELF-CHECK
Before returning, verify: exactly one person; same identity and approximate age; same crop, background and clothing; the visible power level matches Stage ${stage}/10; no ancestry or historical styling; no text or UI.

OUTPUT RULES
Return one seamless portrait only. No collage, split screen, before/after panel, captions, labels, borders, UI, watermark or readable text.`;
}

async function normalizeFrame(buffer, width, height) {
  return sharp(buffer).rotate().resize(width, height, { fit: "cover", position: "attention" }).png().toBuffer();
}

async function processAncestorSeries(form, fetchImpl) {
  const primaryFile = form.get("file")?.size ? form.get("file") : form.getAll("files").find((item) => item?.size);
  const input = await imageInput(primaryFile);
  const requestedStyle = clean(form.get("style"), 40) || "realistic";
  const style = requestedStyle === "dynasty" ? "realistic" : requestedStyle === "clan" ? "cinematic" : requestedStyle;
  if (!["realistic", "cinematic", "chaos"].includes(style)) throw toolError("ANCESTOR_STYLE_INVALID", 400);
  const width = Math.min(1280, input.width);
  const height = Math.max(512, Math.round(width * input.height / input.width));
  const generationStartedAt = Date.now();
  const outputs = [];
  for (let stage = 1; stage <= 10; stage += 1) {
    const generated = await editPlatformImage({
      purpose: "image_editing",
      images: [{ buffer: input.buffer, mimeType: input.mimeType }],
      prompt: ancestorStagePrompt(stage, style),
      fetchImpl,
    });
    const buffer = await normalizeFrame(generated.buffer, width, height);
    outputs.push({
      buffer,
      extension: ".png",
      mimeType: "image/png",
      name: `${safeName(input.name)}-power-${String(stage).padStart(2, "0")}.png`,
      direction: stage <= 5 ? "xu" : "han",
      level: stage,
    });
  }
  return {
    files: outputs,
    output: {
      mode: "ai-ordered-power-series",
      providerPurpose: "image_editing",
      style,
      frameCount: outputs.length,
      generatedFrameCount: 10,
      width,
      height,
      sourceWidth: input.width,
      sourceHeight: input.height,
      latencyMs: Date.now() - generationStartedAt,
      entertainmentOnly: true,
    },
  };
}

export async function processAiImageTool(slug, form, fetchImpl = fetch) {
  if (!aiImageToolSlugs.has(slug)) throw toolError("AI_IMAGE_TOOL_NOT_SUPPORTED", 404);
  if (slug === ancestorSlug) return processAncestorSeries(form, fetchImpl);
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
