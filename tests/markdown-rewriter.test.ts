import { describe, expect, it } from "vitest";
import type { ExportPlan, PlannedMarkdownFile } from "../src/export-types";
import { scanMarkdownLinks } from "../src/link-scanner";
import { rewriteMarkdownFiles } from "../src/markdown-rewriter";

function createPlan(
  file: PlannedMarkdownFile,
  options: {
    markdownPaths?: string[];
    assetPaths?: string[];
  } = {}
): ExportPlan {
  const markdownEntries = new Map<string, PlannedMarkdownFile>([[file.file.path, file]]);
  for (const markdownPath of options.markdownPaths ?? []) {
    markdownEntries.set(markdownPath, {
      file: { path: markdownPath } as PlannedMarkdownFile["file"],
      content: "",
      occurrences: []
    });
  }

  return {
    rootFile: file.file,
    zipRootName: "A-export",
    markdownFiles: markdownEntries,
    assetFiles: new Map(
      (options.assetPaths ?? []).map((assetPath) => [assetPath, { path: assetPath } as never])
    ),
    skippedLinks: 0
  };
}

describe("rewriteMarkdownFiles", () => {
  it("rewrites wiki and markdown links to relative markdown paths", () => {
    const content =
      "[[B|Bee]]\n![[images/pic one.png]]\n[Doc](../docs/guide.md)\n[ext](https://example.com)";
    const occurrences = scanMarkdownLinks(content);
    occurrences[0]!.resolvedPath = "notes/B.md";
    occurrences[1]!.resolvedPath = "notes/images/pic one.png";
    occurrences[2]!.resolvedPath = "docs/guide.md";

    const file = {
      file: { path: "notes/A.md" },
      content,
      occurrences
    } as PlannedMarkdownFile;

    const [rewritten] = rewriteMarkdownFiles(
      createPlan(file, {
        markdownPaths: ["notes/B.md", "docs/guide.md"],
        assetPaths: ["notes/images/pic one.png"]
      })
    );

    expect(rewritten!.content).toBe(
      "[Bee](./B.md)\n![](./images/pic%20one.png)\n[Doc](../docs/guide.md)\n[ext](https://example.com)"
    );
    expect(rewritten!.skippedLinks).toBe(0);
  });

  it("leaves unresolved local links intact and counts them", () => {
    const content = "[[Missing]] and [asset](missing.pdf)";
    const file = {
      file: { path: "A.md" },
      content,
      occurrences: scanMarkdownLinks(content)
    } as PlannedMarkdownFile;

    const [rewritten] = rewriteMarkdownFiles(createPlan(file));

    expect(rewritten!.content).toBe("[[Missing]] and [asset](missing.pdf)");
    expect(rewritten!.skippedLinks).toBe(2);
  });
});
