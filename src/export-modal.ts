import { App, Modal, Notice, Setting, TextComponent } from "obsidian";
import { hasNativeDirectoryPicker, pickDirectory } from "./native-dialog";

export interface ExportModalResult {
  outputDir: string;
  zipName: string;
}

export class ExportConfirmModal extends Modal {
  private outputDir: string;
  private zipName: string;
  private resolvePromise!: (result: ExportModalResult | null) => void;
  private settled = false;

  constructor(
    app: App,
    defaultZipName: string,
    defaultOutputDir: string
  ) {
    super(app);
    this.zipName = defaultZipName;
    this.outputDir = defaultOutputDir;
  }

  async openAndWait(): Promise<ExportModalResult | null> {
    return new Promise<ExportModalResult | null>((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Export note to zip" });

    let currentZipName = this.zipName;
    let zipNameInput: TextComponent | null = null;

    new Setting(contentEl)
      .setName("Archive name")
      .setDesc("The zip file name and the first-level folder name inside the archive.")
      .addText((text) =>
        (zipNameInput = text)
          .setPlaceholder("My export")
          .setValue(this.zipName)
          .onChange((value) => {
            currentZipName = value.trim();
            this.zipName = currentZipName;
          })
      );

    let currentValue = this.outputDir;

    let outputInput: TextComponent | null = null;

    const outputSetting = new Setting(contentEl)
      .setName("Output directory")
      .setDesc("Choose the absolute directory path for the generated zip file.");

    outputSetting.addText((text) =>
      (outputInput = text)
        .setPlaceholder("/Users/you/Exports")
        .setValue(this.outputDir)
        .onChange((value) => {
          currentValue = value.trim();
          this.outputDir = currentValue;
        })
    );

    outputSetting.addButton((button) =>
      button
        .setButtonText("Browse...")
        .setDisabled(!hasNativeDirectoryPicker())
        .onClick(async () => {
          const selectedDirectory = await pickDirectory(
            currentValue,
            "Choose export directory"
          );
          if (!selectedDirectory) {
            if (!hasNativeDirectoryPicker()) {
              new Notice("Native directory picker is unavailable in this Obsidian build.");
            }
            return;
          }

          currentValue = selectedDirectory;
          this.outputDir = selectedDirectory;
          outputInput?.setValue(selectedDirectory);
        })
    );

    const actionRow = contentEl.createDiv({
      cls: "share-markdown-zip-modal__actions"
    });

    const cancelButton = actionRow.createEl("button", {
      text: "Cancel",
      cls: "mod-cancel"
    });
    cancelButton.addEventListener("click", () => {
      this.finish(null);
      this.close();
    });

    const confirmButton = actionRow.createEl("button", {
      text: "Export",
      cls: "mod-cta"
    });
    confirmButton.addEventListener("click", () => {
      if (!this.outputDir || !this.zipName) {
        return;
      }

      this.finish({
        outputDir: this.outputDir,
        zipName: this.zipName
      });
      this.close();
    });
  }

  onClose(): void {
    this.finish(null);
    this.contentEl.empty();
  }

  private finish(result: ExportModalResult | null): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolvePromise(result);
  }
}
