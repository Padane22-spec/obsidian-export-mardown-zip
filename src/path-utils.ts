import path from "path";
import { FileSystemAdapter, normalizePath } from "obsidian";

const IMAGE_EXTENSIONS = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp"
]);

export function isDesktopVaultAdapter(
  adapter: unknown
): adapter is FileSystemAdapter {
  return adapter instanceof FileSystemAdapter;
}

export function getDefaultOutputDirFromVault(adapter: unknown): string {
  if (!isDesktopVaultAdapter(adapter)) {
    return "";
  }

  return path.join(adapter.getBasePath(), "share-markdown-export");
}

export function sanitizeFileStem(name: string): string {
  return (
    Array.from(name)
      .map((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint < 32 || /[<>:"/\\|?*]/.test(character)) {
          return "-";
        }

        return character;
      })
      .join("")
      .trim() || "export"
  );
}

export function sanitizeArchiveStem(name: string): string {
  const trimmed = name.trim();
  const withoutZip = trimmed.toLowerCase().endsWith(".zip")
    ? trimmed.slice(0, -4)
    : trimmed;
  return sanitizeFileStem(withoutZip);
}

export function ensureRelativeMarkdownPath(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, "/");
  if (
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("#")
  ) {
    return normalized;
  }
  return `./${normalized}`;
}

export function toVaultRelativePath(
  sourceFilePath: string,
  targetFilePath: string
): string {
  const relative = path.posix.relative(
    path.posix.dirname(sourceFilePath),
    targetFilePath
  );
  return ensureRelativeMarkdownPath(relative || path.posix.basename(targetFilePath));
}

export function normalizeVaultLinkPath(sourceDir: string, candidate: string): string {
  return normalizePath(path.posix.join(sourceDir, candidate));
}

export function isExternalLink(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(target) || /^[a-z][a-z0-9+.-]*:/i.test(target);
}

export function isImageExtension(filePath: string): boolean {
  const extension = path.posix.extname(filePath).slice(1).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension);
}

export function appendSubpath(target: string, subpath: string | null): string {
  return subpath ? `${target}${subpath}` : target;
}

export function splitLinkTarget(target: string): {
  linkPath: string;
  subpath: string | null;
} {
  const trimmed = target.trim();
  if (!trimmed) {
    return { linkPath: "", subpath: null };
  }

  if (trimmed.startsWith("#")) {
    return { linkPath: "", subpath: trimmed };
  }

  const hashIndex = trimmed.indexOf("#");
  if (hashIndex === -1) {
    return { linkPath: trimmed, subpath: null };
  }

  return {
    linkPath: trimmed.slice(0, hashIndex),
    subpath: trimmed.slice(hashIndex)
  };
}
