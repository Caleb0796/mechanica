import * as THREE from "three";

export const MATERIAL_TEXTURE_VARIANTS = [
  "wood:dark",
  "wood:light",
  "bronze:fresh",
  "bronze:excavated",
  "bronze:gilded",
  "bronze:openwork",
  "silver:openwork",
  "iron:cast",
  "lacquer:black",
  "lacquer:red",
  "silk:natural",
] as const;

export type MaterialTextureVariant =
  (typeof MATERIAL_TEXTURE_VARIANTS)[number] | "none";

export interface MaterialTextureSet {
  alphaMap?: THREE.CanvasTexture;
  alphaTest?: number;
  map: THREE.CanvasTexture;
  metalness: number;
  normalMap: THREE.CanvasTexture;
  normalScale: number;
  roughnessMap: THREE.CanvasTexture;
  variant: Exclude<MaterialTextureVariant, "none">;
}

interface VariantPalette {
  high: readonly [number, number, number];
  low: readonly [number, number, number];
  metalness: number;
  normalScale: number;
  roughness: readonly [number, number];
  seed: number;
}

interface SurfaceFields {
  height: Float32Array;
  variation: Float32Array;
}

const MAP_SIZE = 512;
const SURFACE_SIZE = 256;
const MAX_TEXTURE_SETS = 12;
const textureCache = new Map<string, MaterialTextureSet>();
let generationMs = 0;

const PALETTES: Record<
  Exclude<MaterialTextureVariant, "none">,
  VariantPalette
> = {
  "wood:dark": {
    high: [90, 57, 37],
    low: [42, 25, 17],
    metalness: 0.08,
    normalScale: 0.42,
    roughness: [0.58, 0.86],
    seed: 1103,
  },
  "wood:light": {
    high: [194, 126, 70],
    low: [104, 58, 29],
    metalness: 0.08,
    normalScale: 0.38,
    roughness: [0.48, 0.76],
    seed: 1877,
  },
  "bronze:fresh": {
    high: [203, 169, 102],
    low: [126, 91, 48],
    metalness: 0.9,
    normalScale: 0.24,
    roughness: [0.24, 0.5],
    seed: 2473,
  },
  "bronze:excavated": {
    high: [101, 139, 113],
    low: [47, 76, 65],
    metalness: 0.76,
    normalScale: 0.36,
    roughness: [0.4, 0.84],
    seed: 3167,
  },
  "bronze:gilded": {
    high: [240, 211, 111],
    low: [173, 130, 34],
    metalness: 1,
    normalScale: 0.12,
    roughness: [0.14, 0.24],
    seed: 3761,
  },
  "bronze:openwork": {
    high: [188, 148, 83],
    low: [65, 105, 87],
    metalness: 0.84,
    normalScale: 0.3,
    roughness: [0.32, 0.68],
    seed: 4339,
  },
  "silver:openwork": {
    high: [228, 233, 236],
    low: [126, 139, 146],
    metalness: 0.88,
    normalScale: 0.24,
    roughness: [0.22, 0.46],
    seed: 4663,
  },
  "iron:cast": {
    high: [78, 84, 88],
    low: [42, 46, 49],
    metalness: 0.8,
    normalScale: 0.28,
    roughness: [0.48, 0.68],
    seed: 5003,
  },
  "lacquer:black": {
    high: [45, 20, 15],
    low: [18, 9, 7],
    metalness: 0.1,
    normalScale: 0.12,
    roughness: [0.1, 0.22],
    seed: 5683,
  },
  "lacquer:red": {
    high: [123, 32, 20],
    low: [54, 10, 7],
    metalness: 0.12,
    normalScale: 0.14,
    roughness: [0.12, 0.25],
    seed: 6329,
  },
  "silk:natural": {
    high: [240, 231, 208],
    low: [176, 163, 137],
    metalness: 0,
    normalScale: 0.32,
    roughness: [0.5, 0.76],
    seed: 6997,
  },
};

function hashNoise(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function smoothNoise(x: number, y: number, seed: number, cell: number): number {
  const gridX = Math.floor(x / cell);
  const gridY = Math.floor(y / cell);
  const localX = (x - gridX * cell) / cell;
  const localY = (y - gridY * cell) / cell;
  const easedX = localX * localX * (3 - 2 * localX);
  const easedY = localY * localY * (3 - 2 * localY);
  const top = THREE.MathUtils.lerp(
    hashNoise(gridX, gridY, seed),
    hashNoise(gridX + 1, gridY, seed),
    easedX,
  );
  const bottom = THREE.MathUtils.lerp(
    hashNoise(gridX, gridY + 1, seed),
    hashNoise(gridX + 1, gridY + 1, seed),
    easedX,
  );
  return THREE.MathUtils.lerp(top, bottom, easedY);
}

function surfaceHeight(
  variant: Exclude<MaterialTextureVariant, "none">,
  x: number,
  y: number,
  seed: number,
): number {
  const broad = smoothNoise(x, y, seed, 32);
  const fine = smoothNoise(x, y, seed + 97, 8);
  if (variant.startsWith("wood:")) {
    const rings = 0.5 + 0.5 * Math.sin(x * 0.085 + broad * 3.2 + y * 0.012);
    return THREE.MathUtils.clamp(
      rings * 0.34 + fine * 0.24 + broad * 0.42,
      0,
      1,
    );
  }
  if (variant.startsWith("lacquer:")) {
    const stroke = 0.5 + 0.5 * Math.sin(y * 0.34 + broad * 3.2);
    return stroke * 0.28 + fine * 0.12 + 0.42;
  }
  if (variant === "silk:natural") {
    const warp = 0.5 + 0.5 * Math.sin(x * 1.28);
    const weft = 0.5 + 0.5 * Math.sin(y * 1.24);
    return THREE.MathUtils.clamp(warp * 0.42 + weft * 0.42 + fine * 0.16, 0, 1);
  }
  if (variant === "iron:cast") {
    return THREE.MathUtils.clamp(broad * 0.5 + fine * 0.5, 0, 1);
  }
  const patina = variant === "bronze:excavated" ? broad ** 0.7 : broad;
  const relief = variant === "bronze:gilded" ? 0.12 : 0.32;
  return THREE.MathUtils.clamp(0.42 + patina * relief + fine * 0.18, 0, 1);
}

function surfaceVariation(
  variant: Exclude<MaterialTextureVariant, "none">,
  x: number,
  y: number,
  seed: number,
): number {
  if (variant.startsWith("wood:")) {
    const broad = smoothNoise(x, y, seed + 541, 48);
    const warp = (smoothNoise(x, y, seed + 997, 64) - 0.5) * 7;
    const grain = 0.5 + 0.5 * Math.sin(x * 0.16 + y * 0.018 + warp);
    return THREE.MathUtils.clamp(grain * 0.64 + broad * 0.36, 0, 1);
  }
  if (variant.startsWith("bronze:")) {
    const broad = smoothNoise(x, y, seed + 541, 48);
    const clustered = smoothNoise(x, y, seed + 853, 14);
    return THREE.MathUtils.smoothstep(
      broad * 0.72 + clustered * 0.28,
      0.56,
      0.86,
    );
  }
  return 0;
}

function buildSurfaceFields(
  variant: Exclude<MaterialTextureVariant, "none">,
  seed: number,
): SurfaceFields {
  const height = new Float32Array(SURFACE_SIZE * SURFACE_SIZE);
  const variation = new Float32Array(SURFACE_SIZE * SURFACE_SIZE);
  for (let y = 0; y < SURFACE_SIZE; y += 1) {
    for (let x = 0; x < SURFACE_SIZE; x += 1) {
      const index = y * SURFACE_SIZE + x;
      height[index] = surfaceHeight(variant, x, y, seed);
      variation[index] = surfaceVariation(variant, x, y, seed);
    }
  }
  return { height, variation };
}

function mixChannel(low: number, high: number, amount: number): number {
  return Math.round(THREE.MathUtils.lerp(low, high, amount));
}

function buildColorPixels(
  variant: Exclude<MaterialTextureVariant, "none">,
  fields: SurfaceFields,
  palette: VariantPalette,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(MAP_SIZE * MAP_SIZE * 4);
  const bronzePatina = variant.startsWith("bronze:")
    ? {
        color:
          variant === "bronze:gilded"
            ? ([104, 119, 70] as const)
            : ([51, 96, 76] as const),
        strength:
          variant === "bronze:gilded"
            ? 0.055
            : variant === "bronze:excavated"
              ? 0.24
              : 0.16,
      }
    : null;
  for (let y = 0; y < MAP_SIZE; y += 1) {
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const sourceIndex = Math.floor(y / 2) * SURFACE_SIZE + Math.floor(x / 2);
      const surface = fields.height[sourceIndex];
      const variation = fields.variation[sourceIndex];
      const amount = variant.startsWith("wood:")
        ? THREE.MathUtils.clamp(
            0.34 + surface * 0.34 + (variation - 0.5) * 0.2,
            0,
            1,
          )
        : variant.startsWith("bronze:")
          ? THREE.MathUtils.clamp(0.34 + surface * 0.42, 0, 1)
          : surface;
      const pixel = (y * MAP_SIZE + x) * 4;
      const patinaAmount = bronzePatina ? variation * bronzePatina.strength : 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = mixChannel(
          palette.low[channel],
          palette.high[channel],
          amount,
        );
        pixels[pixel + channel] = bronzePatina
          ? mixChannel(base, bronzePatina.color[channel], patinaAmount)
          : base;
      }
      pixels[pixel + 3] = 255;
    }
  }
  return pixels;
}

function buildNormalPixels(height: Float32Array): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(SURFACE_SIZE * SURFACE_SIZE * 4);
  for (let y = 0; y < SURFACE_SIZE; y += 1) {
    const up = Math.max(0, y - 1);
    const down = Math.min(SURFACE_SIZE - 1, y + 1);
    for (let x = 0; x < SURFACE_SIZE; x += 1) {
      const left = Math.max(0, x - 1);
      const right = Math.min(SURFACE_SIZE - 1, x + 1);
      const dx =
        height[y * SURFACE_SIZE + right] - height[y * SURFACE_SIZE + left];
      const dy =
        height[down * SURFACE_SIZE + x] - height[up * SURFACE_SIZE + x];
      const normalX = -dx * 2.4;
      const normalY = -dy * 2.4;
      const normalLength = Math.sqrt(normalX ** 2 + normalY ** 2 + 1);
      const pixel = (y * SURFACE_SIZE + x) * 4;
      pixels[pixel] = Math.round((normalX / normalLength / 2 + 0.5) * 255);
      pixels[pixel + 1] = Math.round((normalY / normalLength / 2 + 0.5) * 255);
      pixels[pixel + 2] = Math.round((1 / normalLength / 2 + 0.5) * 255);
      pixels[pixel + 3] = 255;
    }
  }
  return pixels;
}

function buildRoughnessPixels(
  variant: Exclude<MaterialTextureVariant, "none">,
  fields: SurfaceFields,
  roughness: readonly [number, number],
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(fields.height.length * 4);
  for (let index = 0; index < fields.height.length; index += 1) {
    const surfaceAmount =
      variant.startsWith("bronze:") || variant.startsWith("wood:")
        ? 0.24 + fields.height[index] * 0.52
        : fields.height[index];
    let value = THREE.MathUtils.lerp(roughness[1], roughness[0], surfaceAmount);
    if (variant.startsWith("bronze:")) {
      const patinaLift = variant === "bronze:gilded" ? 0.04 : 0.18;
      value += fields.variation[index] * patinaLift;
    } else if (variant.startsWith("wood:")) {
      value += (fields.variation[index] - 0.5) * 0.1;
    }
    const encoded = Math.round(THREE.MathUtils.clamp(value, 0, 1) * 255);
    const pixel = index * 4;
    pixels[pixel] = encoded;
    pixels[pixel + 1] = encoded;
    pixels[pixel + 2] = encoded;
    pixels[pixel + 3] = 255;
  }
  return pixels;
}

function buildOpenworkPixels(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(SURFACE_SIZE * SURFACE_SIZE * 4);
  for (let y = 0; y < SURFACE_SIZE; y += 1) {
    for (let x = 0; x < SURFACE_SIZE; x += 1) {
      const cellX = x % 24;
      const cellY = y % 24;
      const visible =
        Math.abs(cellX - 12) <= 2 ||
        Math.abs(cellY - 12) <= 2 ||
        Math.abs(cellX - cellY) <= 1;
      const value = visible ? 255 : 0;
      const pixel = (y * SURFACE_SIZE + x) * 4;
      pixels[pixel] = value;
      pixels[pixel + 1] = value;
      pixels[pixel + 2] = value;
      pixels[pixel + 3] = 255;
    }
  }
  return pixels;
}

function canvasFromPixels(
  size: number,
  pixels: Uint8ClampedArray,
): HTMLCanvasElement {
  if (typeof document === "undefined") {
    return {
      data: pixels,
      height: size,
      width: size,
    } as unknown as HTMLCanvasElement;
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context is unavailable");
  const image = context.createImageData(size, size);
  image.data.set(pixels);
  context.putImageData(image, 0, 0);
  return canvas;
}

function canvasTexture(
  size: number,
  pixels: Uint8ClampedArray,
  color: boolean,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvasFromPixels(size, pixels));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 4;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function generateTextureSet(
  variant: Exclude<MaterialTextureVariant, "none">,
): MaterialTextureSet {
  const palette = PALETTES[variant];
  const fields = buildSurfaceFields(variant, palette.seed);
  const set: MaterialTextureSet = {
    map: canvasTexture(
      MAP_SIZE,
      buildColorPixels(variant, fields, palette),
      true,
    ),
    metalness: palette.metalness,
    normalMap: canvasTexture(
      SURFACE_SIZE,
      buildNormalPixels(fields.height),
      false,
    ),
    normalScale: palette.normalScale,
    roughnessMap: canvasTexture(
      SURFACE_SIZE,
      buildRoughnessPixels(variant, fields, palette.roughness),
      false,
    ),
    variant,
  };
  if (variant.endsWith(":openwork")) {
    set.alphaMap = canvasTexture(SURFACE_SIZE, buildOpenworkPixels(), false);
    set.alphaTest = 0.42;
  }
  return set;
}

function isTextureVariant(
  variant: string,
): variant is Exclude<MaterialTextureVariant, "none"> {
  return MATERIAL_TEXTURE_VARIANTS.includes(
    variant as Exclude<MaterialTextureVariant, "none">,
  );
}

export function defaultTextureVariant(
  kind: "wood" | "bronze" | "iron" | "silver" | "silk" | "clay",
): MaterialTextureVariant {
  if (kind === "wood") return "wood:dark";
  if (kind === "bronze") return "bronze:fresh";
  if (kind === "iron") return "iron:cast";
  if (kind === "silk") return "silk:natural";
  return "none";
}

export function textureShaderFeatureHash(variant: string): string {
  if (variant === "none") return "flat";
  if (!isTextureVariant(variant)) {
    throw new Error(`Unknown material texture variant: ${variant}`);
  }
  return variant.endsWith(":openwork")
    ? "map+normal+roughness+alphaTest"
    : "map+normal+roughness";
}

export function getMaterialTextureSet(
  variant: string,
): MaterialTextureSet | undefined {
  if (variant === "none") return undefined;
  if (!isTextureVariant(variant)) {
    throw new Error(`Unknown material texture variant: ${variant}`);
  }
  const cached = textureCache.get(variant);
  if (cached) return cached;
  if (textureCache.size >= MAX_TEXTURE_SETS) {
    throw new Error(`Material texture cache exceeds ${MAX_TEXTURE_SETS} sets`);
  }
  const startedAt = performance.now();
  const generated = generateTextureSet(variant);
  generationMs += performance.now() - startedAt;
  textureCache.set(variant, generated);
  return generated;
}

export function warmMaterialTextures(): {
  entries: number;
  generationMs: number;
  textures: number;
} {
  for (const variant of MATERIAL_TEXTURE_VARIANTS) {
    getMaterialTextureSet(variant);
  }
  return materialTextureStats();
}

export function materialTextureStats(): {
  entries: number;
  generationMs: number;
  textures: number;
} {
  let textures = 0;
  for (const set of textureCache.values()) {
    textures += set.alphaMap ? 4 : 3;
  }
  return { entries: textureCache.size, generationMs, textures };
}

export function disposeMaterialTextureCache(): number {
  let disposed = 0;
  for (const set of textureCache.values()) {
    for (const texture of [
      set.map,
      set.normalMap,
      set.roughnessMap,
      set.alphaMap,
    ]) {
      if (!texture) continue;
      texture.dispose();
      disposed += 1;
    }
  }
  textureCache.clear();
  generationMs = 0;
  return disposed;
}
