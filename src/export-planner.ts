import path from "path";
import type { App, TFile } from "obsidian";
import { scanMarkdownLinks } from "./link-scanner";
import type { ExportPlan, PlannedMarkdownFile } from "./export-types";
import { normalizeVaultLinkPath } from "./path-utils";

export class ExportPlanner {
  constructor(private readonly app: App) {}

  async createPlan(rootFile: TFile, zipRootName: string): Promise<ExportPlan> {
    const markdownFiles = new Map<string, PlannedMarkdownFile>();
    const assetFiles = new Map<string, TFile>();
    const pendingPaths = [rootFile.path];
    let skippedLinks = 0;

    while (pendingPaths.length > 0) {
      const currentPath = pendingPaths.pop();
      if (!currentPath || markdownFiles.has(currentPath)) {
        continue;
      }

      const currentFile = this.lookupFile(currentPath);
      if (!currentFile) {
        continue;
      }

      const content = await this.app.vault.cachedRead(currentFile);
      const occurrences = scanMarkdownLinks(content);

      for (const occurrence of occurrences) {
        if (occurrence.isExternal || occurrence.isAnchorOnly) {
          continue;
        }

        const resolved = this.resolveTarget(currentFile.path, occurrence.linkPath);
        occurrence.resolvedPath = resolved?.path ?? null;

        if (!resolved) {
          skippedLinks += 1;
          continue;
        }

        if (resolved.extension === "md") {
          if (!markdownFiles.has(resolved.path)) {
            pendingPaths.push(resolved.path);
          }
          continue;
        }

        assetFiles.set(resolved.path, resolved);
      }

      markdownFiles.set(currentFile.path, {
        file: currentFile,
        content,
        occurrences
      });
    }

    return {
      rootFile,
      zipRootName,
      markdownFiles,
      assetFiles,
      skippedLinks
    };
  }

  private resolveTarget(sourcePath: string, targetPath: string): TFile | null {
    if (!targetPath) {
      return null;
    }

    const resolvedFromCache = this.app.metadataCache.getFirstLinkpathDest(
      targetPath,
      sourcePath
    );
    if (resolvedFromCache) {
      return resolvedFromCache;
    }

    const normalized = normalizeVaultLinkPath(path.posix.dirname(sourcePath), targetPath);
    return this.lookupFile(normalized);
  }

  private lookupFile(filePath: string): TFile | null {
    const candidate = this.app.vault.getAbstractFileByPath(filePath);
    if (!candidate || !("extension" in candidate) || typeof candidate.extension !== "string") {
      return null;
    }

    return candidate as TFile;
  }
}
