const ALIYUN_API = "https://registry.npmmirror.com";

interface EmojiData {
  compressed: boolean
  categories: Array<{
    id: string
    name: string
    emojis: string[]
  }>
  emojis: Record<string, {
    a: string
    b: string
    j?: string[]
  }>
  aliases: Record<string, string>
}

export interface EmojiItem {
  id: string
  name: string
  emoji: string
  keywords: string[]
}

export interface EmojiGroup {
  category: string
  emojis: EmojiItem[]
}

export interface EmojiUrl {
  path: string
  pkg: string
  version: string
}

export function unifiedToEmoji(unified: string): string {
  return unified
    .split("-")
    .map(u => String.fromCodePoint(Number.parseInt(u, 16)))
    .join("");
}

export function getEmojiByShortName(
  shortName: string,
  emojis: EmojiData["emojis"],
  aliases?: EmojiData["aliases"],
) {
  const key = shortName;
  return emojis[aliases?.[key] || key];
}

export function buildEmojiGroups(rawData: EmojiData): EmojiGroup[] {
  const { emojis, categories, aliases } = rawData;
  return categories.map((cat) => {
    const group: EmojiGroup = {
      category: cat.name,
      emojis: [],
    };
    cat.emojis.forEach((shortName) => {
      const emojiObj = getEmojiByShortName(shortName, emojis, aliases);
      if (emojiObj && emojiObj.b) {
        group.emojis.push({
          id: shortName,
          name: emojiObj.a,
          emoji: unifiedToEmoji(emojiObj.b),
          keywords: emojiObj.j || [],
        });
      }
    });
    return group;
  });
}

export function emojiToUnicode(emoji: string): string {
  return [...emoji].map(char => char.codePointAt(0)!.toString(16)).join("-");
}

/**
 * 获取表情动画包
 * @param emoji 表情
 * @returns 表情动画包
 */
export function emojiAnimPkg(emoji: string): string {
  const mainPart = emojiToUnicode(emoji).split("-")[0] as string;
  if (mainPart < "1f469") {
    return "@lobehub/fluent-emoji-anim-1";
  }
  else if (mainPart >= "1f469" && mainPart < "1f620") {
    return "@lobehub/fluent-emoji-anim-2";
  }
  else if (mainPart >= "1f620" && mainPart < "1f9a0") {
    return "@lobehub/fluent-emoji-anim-3";
  }
  else {
    return "@lobehub/fluent-emoji-anim-4";
  }
}

export type EmojiType = "raw" | "anim" | "3d" | "flat" | "modern" | "mono";

/**
 * 生成表情 URL
 * @param emoji 表情
 * @param type 表情类型
 * @returns 表情 URL
 */
export function genEmojiUrl(emoji: string, type: EmojiType): EmojiUrl | null {
  const ext = ["anim", "3d"].includes(type) ? "webp" : "svg";

  switch (type) {
    case "raw": {
      return null;
    }
    case "anim": {
      return {
        path: `assets/${emojiToUnicode(emoji)}.${ext}`,
        pkg: emojiAnimPkg(emoji),
        version: "latest",
      };
    }
    case "3d": {
      return {
        path: `assets/${emojiToUnicode(emoji)}.${ext}`,
        pkg: "@lobehub/fluent-emoji-3d",
        version: "latest",
      };
    }
    case "flat": {
      return {
        path: `assets/${emojiToUnicode(emoji)}.${ext}`,
        pkg: "@lobehub/fluent-emoji-flat",
        version: "latest",
      };
    }
    case "modern": {
      return {
        path: `assets/${emojiToUnicode(emoji)}.${ext}`,
        pkg: "@lobehub/fluent-emoji-modern",
        version: "latest",
      };
    }
    case "mono": {
      return {
        path: `assets/${emojiToUnicode(emoji)}.${ext}`,
        pkg: "@lobehub/fluent-emoji-mono",
        version: "latest",
      };
    }
  }
}

export type CdnProxy = "unpkg" | "aliyun";

/**
 * 生成 CDN URL
 * @param emojiUrl 表情 URL
 * @param proxy CDN 代理
 * @returns CDN URL
 */
export function genCdnUrl(emojiUrl: EmojiUrl, proxy: CdnProxy = "unpkg"): string {
  const { pkg, version = "latest", path } = emojiUrl;
  switch (proxy) {
    case "unpkg": {
      return `https://unpkg.com/${pkg}@${version}/${path}`;
    }
    default: {
      return `${ALIYUN_API}/${pkg}/${version}/files/${path}`;
    }
  }
}
