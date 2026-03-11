import type { LinkOccurrence } from "./export-types";
import { isExternalLink, splitLinkTarget } from "./path-utils";

const WIKI_LINK_PATTERN = /(!)?\[\[([\s\S]*?)\]\]/g;
const MARKDOWN_LINK_PATTERN = /(!)?\[([^\]]*?)\]\(([^)\n]+)\)/g;

export function scanMarkdownLinks(content: string): LinkOccurrence[] {
  const occurrences: LinkOccurrence[] = [];

  for (const match of content.matchAll(WIKI_LINK_PATTERN)) {
    const start = match.index ?? 0;
    const fullMatch = match[0];
    const inner = match[2]?.trim() ?? "";
    const separatorIndex = inner.indexOf("|");
    const target = separatorIndex >= 0 ? inner.slice(0, separatorIndex).trim() : inner;
    const label = separatorIndex >= 0 ? inner.slice(separatorIndex + 1).trim() : null;
    const { linkPath, subpath } = splitLinkTarget(target);

    occurrences.push({
      start,
      end: start + fullMatch.length,
      fullMatch,
      syntax: "wiki",
      isEmbed: Boolean(match[1]),
      linkPath: decodeTarget(linkPath),
      subpath,
      label: label || null,
      rawTarget: target,
      resolvedPath: null,
      isExternal: isExternalLink(target),
      isAnchorOnly: target.startsWith("#")
    });
  }

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const start = match.index ?? 0;
    const fullMatch = match[0];
    const destination = parseMarkdownDestination(match[3] ?? "");
    const { linkPath, subpath } = splitLinkTarget(destination);

    occurrences.push({
      start,
      end: start + fullMatch.length,
      fullMatch,
      syntax: "markdown",
      isEmbed: Boolean(match[1]),
      linkPath: decodeTarget(linkPath),
      subpath,
      label: match[2] ?? null,
      rawTarget: destination,
      resolvedPath: null,
      isExternal: isExternalLink(destination),
      isAnchorOnly: destination.startsWith("#")
    });
  }

  return occurrences.sort((left, right) => left.start - right.start);
}

function parseMarkdownDestination(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("<")) {
    const end = trimmed.indexOf(">");
    return end >= 0 ? trimmed.slice(1, end) : trimmed.slice(1);
  }

  let destination = "";
  let escaped = false;

  for (const character of trimmed) {
    if (!escaped && /\s/.test(character)) {
      break;
    }

    if (!escaped && character === "\\") {
      escaped = true;
      continue;
    }

    destination += character;
    escaped = false;
  }

  return destination;
}

function decodeTarget(target: string): string {
  if (!target) {
    return target;
  }

  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}
