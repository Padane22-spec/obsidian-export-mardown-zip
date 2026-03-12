import { describe, expect, it } from "vitest";
import type { App, TFile } from "obsidian";
import { TFile as ObsidianTFile } from "obsidian";
import { ExportPlanner } from "../src/export-planner";

function createFile(path: string, content = ""): TFile {
  const name = path.split("/").pop() ?? path;
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const basename = extension ? name.slice(0, -(extension.length + 1)) : name;
  const file = new ObsidianTFile();
  file.path = path;
  file.name = name;
  file.basename = basename;
  file.extension = extension;

  return file as TFile & { content: string };
}

function createApp(files: Record<string, string>): App {
  const fileMap = new Map<string, TFile>();
  const contentMap = new Map<string, string>();
  for (const [filePath, content] of Object.entries(files)) {
    const file = createFile(filePath, content);
    fileMap.set(filePath, file);
    contentMap.set(filePath, content);
  }

  return {
    vault: {
      cachedRead: async (file: TFile) => contentMap.get(file.path) ?? "",
      getAbstractFileByPath: (filePath: string) => fileMap.get(filePath) ?? null
    },
    metadataCache: {
      getFirstLinkpathDest: (linkPath: string, sourcePath: string) => {
        const sourceDir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : "";
        const candidates = [
          linkPath,
          linkPath.endsWith(".md") ? linkPath : `${linkPath}.md`,
          sourceDir ? `${sourceDir}/${linkPath}`.replace(/\/\.\//g, "/") : linkPath,
          sourceDir && !linkPath.endsWith(".md")
            ? `${sourceDir}/${linkPath}.md`.replace(/\/\.\//g, "/")
            : linkPath
        ];
        for (const candidate of candidates) {
          if (fileMap.has(candidate)) {
            return fileMap.get(candidate) ?? null;
          }
        }
        return null;
      }
    }
  } as App;
}

describe("ExportPlanner", () => {
  it("collects recursive markdown files and attachments without duplicates", async () => {
    const app = createApp({
      "A.md": "[[B]] ![[assets/image.png]]",
      "B.md": "[[folder/C.md]] [External](https://example.com)",
      "folder/C.md": "[[A]]",
      "assets/image.png": ""
    });

    const planner = new ExportPlanner(app);
    const plan = await planner.createPlan(createFile("A.md"), "A-export");

    expect([...plan.markdownFiles.keys()].sort()).toEqual([
      "A.md",
      "B.md",
      "folder/C.md"
    ]);
    expect([...plan.assetFiles.keys()]).toEqual(["assets/image.png"]);
    expect(plan.skippedLinks).toBe(0);
  });

  it("does not queue the same markdown file more than once before processing", async () => {
    const readCounts = new Map<string, number>();
    const app = createApp({
      "A.md": "[[B]] [[C]]",
      "B.md": "[[D]]",
      "C.md": "[[D]]",
      "D.md": "leaf"
    });

    const originalCachedRead = app.vault.cachedRead;
    app.vault.cachedRead = async (file: TFile) => {
      readCounts.set(file.path, (readCounts.get(file.path) ?? 0) + 1);
      return originalCachedRead(file);
    };

    const planner = new ExportPlanner(app);
    const plan = await planner.createPlan(createFile("A.md"), "A-export");

    expect([...plan.markdownFiles.keys()].sort()).toEqual([
      "A.md",
      "B.md",
      "C.md",
      "D.md"
    ]);
    expect(readCounts.get("D.md")).toBe(1);
  });

  it("counts unresolved local links as skipped", async () => {
    const app = createApp({
      "A.md": "[[Missing]] ![image](assets/missing.png)"
    });

    const planner = new ExportPlanner(app);
    const plan = await planner.createPlan(createFile("A.md"), "A-export");

    expect(plan.markdownFiles.size).toBe(1);
    expect(plan.skippedLinks).toBe(2);
  });
});
