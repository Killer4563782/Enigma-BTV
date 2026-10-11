export const themes = [
  { id: "enigma", name: "Enigma", color: "#272039" },
  { id: "midnight", name: "Midnight", color: "#202c45" },
  { id: "forest", name: "Forest", color: "#203a32" },
  { id: "graphite", name: "Graphite", color: "#303034" },
] as const;
export type LocalAppearance = { theme: typeof themes[number]["id"]; accent: string };
export const defaultAppearance: LocalAppearance = { theme: "enigma", accent: "#a78bfa" };
export const bannerColors = ["#403052", "#234b63", "#285044", "#633947", "#504427"];
export const validColor = (value: unknown): value is string => typeof value === "string" && /^#[a-f0-9]{6}$/i.test(value);
const key = (accountId: string) => `enigma-appearance-v1:${accountId}`;
export function readLocalAppearance(accountId: string): LocalAppearance {
  try {
    const value = JSON.parse(window.localStorage.getItem(key(accountId)) || "null");
    return { theme: themes.some((theme) => theme.id === value?.theme) ? value.theme : "enigma", accent: validColor(value?.accent) ? value.accent : defaultAppearance.accent };
  } catch { return { ...defaultAppearance }; }
}
export function saveLocalAppearance(accountId: string, value: LocalAppearance) {
  window.localStorage.setItem(key(accountId), JSON.stringify(value));
}
export function bannerBackground(color?: string, image?: string) {
  if (image && /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image))
    return `linear-gradient(0deg, #00000066, #00000011), url("${image}")`;
  return validColor(color) ? `linear-gradient(120deg, ${color}, color-mix(in srgb, ${color} 55%, #101018))` : undefined;
}

function hasImageAnimation(bytes: Uint8Array): boolean {
  const tag = (offset: number, value: string) =>
    [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));

  if (tag(0, "GIF87a") || tag(0, "GIF89a")) return true;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 8 && bytes[0] === 137 && tag(1, "PNG\r\n\u001a\n")) {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (length > bytes.length - offset - 12) break;
      if (tag(offset + 4, "acTL")) return true;
      if (tag(offset + 4, "IDAT")) break;
      offset += length + 12;
    }
  }

  if (bytes.length >= 12 && tag(0, "RIFF") && tag(8, "WEBP")) {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const length = view.getUint32(offset + 4, true);
      if (length > bytes.length - offset - 8) break;
      if (tag(offset, "ANIM") || tag(offset, "ANMF")) return true;
      if (tag(offset, "VP8X") && length > 0 && (bytes[offset + 8] & 2) !== 0) return true;
      offset += length + 8 + (length % 2);
    }
  }

  return false;
}

function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Your image could not be loaded. Please try again."));
    reader.onabort = () => reject(new Error("Image loading was cancelled. Please try again."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Your image could not be loaded. Please try again."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function readAvatarImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image for your avatar.");
  if (!file.size) throw new Error("Choose an image that is not empty.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MiB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const animated = hasImageAnimation(bytes);
  const vector = file.type === "image/svg+xml";
  if (animated && file.size > 512 * 1024) {
    throw new Error("Choose an animated avatar smaller than 512 KiB to keep its animation.");
  }
  if (vector && file.size > 512 * 1024) {
    throw new Error("Choose an SVG avatar smaller than 512 KiB.");
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    try {
      await image.decode();
    } catch {
      throw new Error("Your image could not be decoded. Choose a supported image and try again.");
    }
    // Preserve animated files: drawing them onto a canvas would keep only one frame.
    // SVGs also stay intact so vector animation and browser SVG support are retained.
    if (animated || vector) return await readImageDataUrl(file);

    const scale = Math.min(1, 256 / image.naturalWidth, 256 / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // WebP preserves transparency. Browsers without WebP encoding fall back to PNG.
    const result = canvas.toDataURL("image/webp", 0.82);
    if (!result.startsWith("data:image/") || result.length > 150_000) {
      throw new Error("This image is too detailed. Choose a smaller avatar.");
    }
    return result;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function readBannerImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MiB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / bitmap.width, 600 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.8);
    if (result.length > 700_000) throw new Error("This image is too detailed. Choose a smaller image.");
    return result;
  } finally { bitmap.close(); }
}
