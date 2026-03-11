import { Notice, Platform, Plugin, TFile } from "obsidian";
import { exportNoteToZip, isMarkdownFile } from "./exporter";
import { ExportConfirmModal } from "./export-modal";
import { DEFAULT_SETTINGS, type ShareMarkdownSettings } from "./export-types";
import { getDefaultOutputDirFromVault, sanitizeZipRootName } from "./path-utils";
import { ShareMarkdownSettingTab, mergeSettings } from "./settings";

const EXPORT_ACTIVE_NOTE_COMMAND = "share-markdown:export-active-note-to-zip";
const EXPORT_FILE_COMMAND = "share-markdown:export-file-to-zip";

export default class ShareMarkdownZipPlugin extends Plugin {
  settings!: ShareMarkdownSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new ShareMarkdownSettingTab(this.app, this));

    if (!Platform.isDesktopApp) {
      new Notice("Share Markdown Zip is only available on Obsidian Desktop.");
      return;
    }

    this.addCommand({
      id: EXPORT_ACTIVE_NOTE_COMMAND,
      name: "Export active note to zip",
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
            .setTitle("Export note and linked files to zip")
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
    const outputDir = await this.resolveOutputDir(file);
    if (!outputDir) {
      return;
    }

    try {
      const result = await exportNoteToZip(this.app, {
        rootFile: file,
        outputDir,
        zipRootName: sanitizeZipRootName(file.basename)
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

  private async resolveOutputDir(file: TFile): Promise<string | null> {
    const defaultDir = this.settings.defaultOutputDir.trim();
    if (!defaultDir && !this.settings.promptForOutputDirOnExport) {
      new Notice("Set a default output directory in the plugin settings.");
      return null;
    }

    if (!this.settings.promptForOutputDirOnExport) {
      return defaultDir;
    }

    const modal = new ExportConfirmModal(this.app, `${file.basename}.zip`, defaultDir);
    const result = await modal.openAndWait();
    if (!result) {
      return null;
    }

    if (!result.outputDir.trim()) {
      new Notice("An output directory is required.");
      return null;
    }

    return result.outputDir.trim();
  }
}
