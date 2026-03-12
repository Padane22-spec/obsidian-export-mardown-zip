import path from "path";
import type { ExportPlan, LinkOccurrence, PlannedMarkdownFile } from "./export-types";
import { appendSubpath, isImageExtension, toVaultRelativePath } from "./path-utils";

export interface RewrittenMarkdown {
  filePath: string;
  content: string;
  skippedLinks: number;
}

export function rewriteMarkdownFiles(plan: ExportPlan): RewrittenMarkdown[] {
  const exportedPaths = new Set<string>([
    ...plan.markdownFiles.keys(),
    ...plan.assetFiles.keys()
  ]);

  // Rewriting is driven by the already-planned export set so we never emit links
  // that point outside the archive.
  return Array.from(plan.markdownFiles.values()).map((entry) =>
    rewriteMarkdownFile(entry, exportedPaths)
  );
}

function rewriteMarkdownFile(
  entry: PlannedMarkdownFile,
  exportedPaths: Set<string>
): RewrittenMarkdown {
  let output = "";
  let cursor = 0;
  let skippedLinks = 0;

  // Rebuild the document from link slices so the original formatting survives untouched
  // outside of the specific links we normalize.
  for (const occurrence of entry.occurrences) {
    output += entry.content.slice(cursor, occurrence.start);
    const replacement = rewriteOccurrence(entry.file.path, occurrence, exportedPaths);
    output += replacement.content;
    skippedLinks += replacement.skippedLinks;
    cursor = occurrence.end;
  }

  output += entry.content.slice(cursor);

  return {
    filePath: entry.file.path,
    content: output,
    skippedLinks
  };
}

function rewriteOccurrence(
  sourcePath: string,
  occurrence: LinkOccurrence,
  exportedPaths: Set<string>
): { content: string; skippedLinks: number } {
  if (occurrence.isExternal || occurrence.isAnchorOnly) {
    return { content: occurrence.fullMatch, skippedLinks: 0 };
  }

  if (!occurrence.resolvedPath || !exportedPaths.has(occurrence.resolvedPath)) {
    return { content: occurrence.fullMatch, skippedLinks: 1 };
  }

  const relativeTarget = appendSubpath(
    encodeMarkdownPath(toVaultRelativePath(sourcePath, occurrence.resolvedPath)),
    occurrence.subpath
  );

  // All exported note-to-note links become standard markdown links so they remain portable
  // outside of Obsidian.
  if (path.posix.extname(occurrence.resolvedPath) === ".md") {
    const label = occurrence.label || path.posix.basename(occurrence.resolvedPath, ".md");
    return {
      content: `[${label}](${relativeTarget})`,
      skippedLinks: 0
    };
  }

  const assetLabel = occurrence.label || path.posix.basename(occurrence.resolvedPath);
  if (occurrence.isEmbed && isImageExtension(occurrence.resolvedPath)) {
    return {
      content:
        occurrence.syntax === "markdown" && occurrence.label
          ? `![${occurrence.label}](${relativeTarget})`
          : `![](${relativeTarget})`,
      skippedLinks: 0
    };
  }

  return {
    content: `[${assetLabel}](${relativeTarget})`,
    skippedLinks: 0
  };
}

function encodeMarkdownPath(target: string): string {
  // Encode each path segment separately so spaces are escaped without mangling slashes.
  return target
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
