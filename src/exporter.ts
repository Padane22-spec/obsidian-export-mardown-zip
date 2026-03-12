import { TFile } from "obsidian";
import type { App } from "obsidian";
import { ExportPlanner } from "./export-planner";
import type { ExportRequest, ExportResult } from "./export-types";
import { rewriteMarkdownFiles } from "./markdown-rewriter";
import { writeExportZip } from "./zip-writer";

export async function exportNoteToZip(
  app: App,
  request: ExportRequest
): Promise<ExportResult> {
  const planner = new ExportPlanner(app);
  const plan = await planner.createPlan(request.rootFile, request.zipRootName);
  const rewrittenFiles = rewriteMarkdownFiles(plan);
  const zipPath = await writeExportZip(app, plan, rewrittenFiles, request.outputDir);

  return {
    zipPath,
    exportedMarkdownCount: plan.markdownFiles.size,
    exportedAssetCount: plan.assetFiles.size,
    skippedLinks: plan.skippedLinks
  };
}

export function isMarkdownFile(file: unknown): file is TFile {
  return file instanceof TFile && file.extension === "md";
}
