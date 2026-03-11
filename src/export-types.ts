import type { TFile } from "obsidian";

export interface ShareMarkdownSettings {
  defaultOutputDir: string;
  promptForOutputDirOnExport: boolean;
}

export const DEFAULT_SETTINGS: ShareMarkdownSettings = {
  defaultOutputDir: "",
  promptForOutputDirOnExport: true
};

export interface ExportRequest {
  rootFile: TFile;
  outputDir: string;
  zipRootName: string;
}

export interface ExportResult {
  zipPath: string;
  exportedMarkdownCount: number;
  exportedAssetCount: number;
  skippedLinks: number;
}

export type LinkSyntax = "wiki" | "markdown";

export interface LinkOccurrence {
  start: number;
  end: number;
  fullMatch: string;
  syntax: LinkSyntax;
  isEmbed: boolean;
  linkPath: string;
  subpath: string | null;
  label: string | null;
  rawTarget: string;
  resolvedPath: string | null;
  isExternal: boolean;
  isAnchorOnly: boolean;
}

export interface PlannedMarkdownFile {
  file: TFile;
  content: string;
  occurrences: LinkOccurrence[];
}

export interface ExportPlan {
  rootFile: TFile;
  zipRootName: string;
  markdownFiles: Map<string, PlannedMarkdownFile>;
  assetFiles: Map<string, TFile>;
  skippedLinks: number;
}
