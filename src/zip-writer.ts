import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import type { App } from "obsidian";
import type { ExportPlan } from "./export-types";
import type { RewrittenMarkdown } from "./markdown-rewriter";
import { sanitizeFileStem } from "./path-utils";

export async function writeExportZip(
  app: App,
  plan: ExportPlan,
  rewrittenFiles: RewrittenMarkdown[],
  outputDir: string
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const zip = new JSZip();
  const basePrefix = `${plan.zipRootName}/`;

  for (const file of rewrittenFiles) {
    zip.file(`${basePrefix}${file.filePath}`, file.content);
  }

  for (const asset of plan.assetFiles.values()) {
    const binary = await app.vault.readBinary(asset);
    zip.file(`${basePrefix}${asset.path}`, binary);
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9
    }
  });

  const zipPath = await resolveZipPath(outputDir, plan.zipRootName);
  await fs.writeFile(zipPath, buffer);
  return zipPath;
}

async function resolveZipPath(outputDir: string, zipRootName: string): Promise<string> {
  const stem = sanitizeFileStem(zipRootName);
  const initialPath = path.join(outputDir, `${stem}.zip`);

  try {
    await fs.access(initialPath);
  } catch {
    return initialPath;
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  return path.join(outputDir, `${stem}-${timestamp}.zip`);
}
