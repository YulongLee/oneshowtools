import sharp from "sharp";

const toolError = (code, status = 400) => Object.assign(new Error(code), { code, status });

const layouts = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1600, height: 900 },
  square: { width: 1080, height: 1080 },
};

const templates = {
  paper: { background: "#f8f7f3", panel: "#ffffff", ink: "#172033", accent: "#5b50f6", line: "#d9ddea" },
  aurora: { background: "#eef4ff", panel: "#ffffff", ink: "#15203a", accent: "#6557ff", line: "#cdd9fa" },
  dark: { background: "#141421", panel: "#222236", ink: "#ffffff", accent: "#a78bfa", line: "#42425c" },
  candy: { background: "#fff4f8", panel: "#ffffff", ink: "#35203b", accent: "#f04b91", line: "#f2c9dc" },
};

const escapeXml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

function parseJson(form, key, fallback) {
  try {
    return JSON.parse(String(form.get(key) || "")) || fallback;
  } catch {
    throw toolError("TIER_LIST_INVALID_CONFIGURATION", 422);
  }
}

function normalizedTiers(form) {
  const tiers = parseJson(form, "tiers", []);
  if (!Array.isArray(tiers) || tiers.length < 2 || tiers.length > 10) throw toolError("TIER_LIST_LEVEL_COUNT_INVALID", 422);
  return tiers.map((tier, index) => ({
    id: String(tier.id || `tier-${index + 1}`).slice(0, 60),
    name: String(tier.name || `等级 ${index + 1}`).trim().slice(0, 16),
    color: /^#[0-9a-f]{6}$/i.test(String(tier.color || "")) ? String(tier.color) : "#6757f5",
  }));
}

export async function processTierList(form) {
  const files = form.getAll("files").filter((file) => file?.size);
  if (files.length > 50) throw toolError("TIER_LIST_TOO_MANY_IMAGES", 413);
  for (const file of files) {
    if (!String(file.type || "").startsWith("image/") || file.size > 10 * 1024 * 1024) throw toolError("TIER_LIST_IMAGE_INVALID", 415);
  }

  const tiers = normalizedTiers(form);
  const assignments = parseJson(form, "assignments", []);
  if (!Array.isArray(assignments)) throw toolError("TIER_LIST_INVALID_CONFIGURATION", 422);
  const layout = layouts[String(form.get("layout") || "portrait")] || layouts.portrait;
  const templateKey = String(form.get("template") || "paper");
  const theme = templates[templateKey] || templates.paper;
  const title = String(form.get("title") || "夯拉排行榜").trim().slice(0, 30) || "夯拉排行榜";

  const width = layout.width;
  const height = layout.height;
  const margin = Math.round(width * 0.055);
  const headerHeight = Math.round(height * (layout === layouts.portrait ? 0.17 : 0.2));
  const footerHeight = Math.round(height * 0.075);
  const rowGap = Math.max(8, Math.round(height * 0.007));
  const contentHeight = height - headerHeight - footerHeight - margin;
  const rowHeight = Math.floor((contentHeight - rowGap * (tiers.length - 1)) / tiers.length);
  const labelWidth = Math.round(width * 0.2);
  const rowX = margin;
  const rowWidth = width - margin * 2;
  const itemAreaWidth = rowWidth - labelWidth;

  const rows = tiers.map((tier, index) => {
    const y = headerHeight + index * (rowHeight + rowGap);
    return `<g>
      <rect x="${rowX}" y="${y}" width="${rowWidth}" height="${rowHeight}" rx="${Math.max(10, Math.round(rowHeight * 0.1))}" fill="${theme.panel}" stroke="${theme.line}" stroke-width="2"/>
      <path d="M ${rowX} ${y + 12} Q ${rowX} ${y} ${rowX + 12} ${y} H ${rowX + labelWidth - 18} L ${rowX + labelWidth} ${y + rowHeight / 2} L ${rowX + labelWidth - 18} ${y + rowHeight} H ${rowX + 12} Q ${rowX} ${y + rowHeight} ${rowX} ${y + rowHeight - 12} Z" fill="${tier.color}"/>
      <text x="${rowX + labelWidth * 0.44}" y="${y + rowHeight / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(24, Math.round(rowHeight * 0.24))}" font-weight="800" fill="#fff">${escapeXml(tier.name)}</text>
    </g>`;
  }).join("");

  const backgroundSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="glow"><stop offset="0" stop-color="${theme.accent}" stop-opacity=".18"/><stop offset="1" stop-color="${theme.background}" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="${theme.background}"/>
    <circle cx="${width * 0.86}" cy="${height * 0.08}" r="${width * 0.45}" fill="url(#glow)"/>
    <text x="${width / 2}" y="${headerHeight * 0.42}" text-anchor="middle" font-size="${Math.round(width * 0.058)}" font-weight="900" fill="${theme.ink}">${escapeXml(title)}</text>
    <text x="${width / 2}" y="${headerHeight * 0.66}" text-anchor="middle" font-size="${Math.round(width * 0.022)}" font-weight="500" fill="${theme.ink}" opacity=".62">从夯到拉，主观锐评，仅供娱乐</text>
    ${rows}
    <text x="${width / 2}" y="${height - footerHeight * 0.45}" text-anchor="middle" font-size="${Math.round(width * 0.024)}" font-weight="700" fill="${theme.ink}">你怎么排？分享你的夯拉榜！</text>
  </svg>`);

  const composites = [{ input: backgroundSvg, top: 0, left: 0 }];
  for (const [tierIndex, tier] of tiers.entries()) {
    const tierItems = assignments
      .filter((item) => String(item.tierId) === tier.id && Number.isInteger(Number(item.fileIndex)) && files[Number(item.fileIndex)])
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (!tierItems.length) continue;
    const itemGap = Math.max(8, Math.round(width * 0.009));
    const maxItemWidth = Math.max(48, Math.floor((itemAreaWidth - itemGap * (tierItems.length + 1)) / tierItems.length));
    const itemSize = Math.min(Math.round(rowHeight * 0.78), maxItemWidth);
    const y = headerHeight + tierIndex * (rowHeight + rowGap) + Math.round((rowHeight - itemSize) / 2);
    for (const [itemIndex, item] of tierItems.entries()) {
      const input = Buffer.from(await files[Number(item.fileIndex)].arrayBuffer());
      const image = await sharp(input).rotate().resize(itemSize, itemSize, { fit: "cover", position: "attention" }).png().toBuffer();
      composites.push({ input: image, left: rowX + labelWidth + itemGap + itemIndex * (itemSize + itemGap), top: y });
    }
  }

  const buffer = await sharp({ create: { width, height, channels: 4, background: theme.background } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    buffer,
    name: `${title.replace(/[\\/:*?"<>|]/g, "-")}-${layout.width}x${layout.height}.png`,
    mimeType: "image/png",
    extension: ".png",
    output: { title, layout: String(form.get("layout") || "portrait"), template: templateKey, tierCount: tiers.length, itemCount: files.length, width, height },
  };
}
