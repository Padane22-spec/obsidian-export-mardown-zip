import { Notice, Platform, Plugin, TFile } from "obsidian";
import { exportNoteToZip, isMarkdownFile } from "./exporter";
import { ExportConfirmModal } from "./export-modal";
import { DEFAULT_SETTINGS, type ShareMarkdownSettings } from "./export-types";
import { getDefaultOutputDirFromVault, sanitizeArchiveStem } from "./path-utils";
import { ShareMarkdownSettingTab, mergeSettings } from "./settings";

const EXPORT_ACTIVE_NOTE_COMMAND = "export-markdown-zip:export-markdown-zip";
const EXPORT_ICON = "archive";
const EXPORT_ACTION_NAME = "Export markdown ZIP";

export default class ShareMarkdownZipPlugin extends Plugin {
  settings!: ShareMarkdownSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new ShareMarkdownSettingTab(this.app, this));

    if (!Platform.isDesktopApp) {
      new Notice("Export markdown ZIP is only available on Obsidian Desktop.");
      return;
    }

    this.addCommand({
      id: EXPORT_ACTIVE_NOTE_COMMAND,
      name: EXPORT_ACTION_NAME,
      icon: EXPORT_ICON,
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!isMarkdownFile(file)) {
          return false;
        }

        if (!checking) {
          void this.runExport(file);
        }

        return true;
      }
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || file.extension !== "md") {
          return;
        }

        menu.addItem((item) =>
          item
            .setTitle(EXPORT_ACTION_NAME)
            .setIcon(EXPORT_ICON)
            .onClick(() => {
              void this.runExport(file);
            })
        );
      })
    );
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<ShareMarkdownSettings> | null;
    const defaultOutputDir = getDefaultOutputDirFromVault(this.app.vault.adapter);
    this.settings = mergeSettings(
      {
        ...DEFAULT_SETTINGS,
        defaultOutputDir
      },
      stored
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async runExport(file: TFile): Promise<void> {
    const exportOptions = await this.resolveExportOptions(file);
    if (!exportOptions) {
      return;
    }

    try {
      const result = await exportNoteToZip(this.app, {
        rootFile: file,
        outputDir: exportOptions.outputDir,
        zipRootName: exportOptions.zipName
      });
      new Notice(
        `Exported ${result.exportedMarkdownCount} markdown files and ${result.exportedAssetCount} attachments to ${result.zipPath}`
      );
    } catch (error) {
      console.error("Share Markdown Zip export failed", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      new Notice(`Export failed: ${message}`);
    }
  }

  private async resolveExportOptions(
    file: TFile
  ): Promise<{ outputDir: string; zipName: string } | null> {
    const defaultDir = this.settings.defaultOutputDir.trim();
    const defaultZipName = sanitizeArchiveStem(file.basename);
    if (!defaultDir && !this.settings.promptForOutputDirOnExport) {
      new Notice("Set a default output directory in the plugin settings.");
      return null;
    }

    if (!this.settings.promptForOutputDirOnExport) {
      return {
        outputDir: defaultDir,
        zipName: defaultZipName
      };
    }

    // Prompt mode is the user-facing path for choosing both the archive name and destination.
    const modal = new ExportConfirmModal(this.app, defaultZipName, defaultDir);
    const result = await modal.openAndWait();
    if (!result) {
      return null;
    }

    if (!result.outputDir.trim()) {
      new Notice("An output directory is required.");
      return null;
    }

    if (!result.zipName.trim()) {
      new Notice("An archive name is required.");
      return null;
    }

    return {
      outputDir: result.outputDir.trim(),
      zipName: sanitizeArchiveStem(result.zipName)
    };
  }
}
