import { App, Modal, Notice, Setting, TextComponent } from "obsidian";
import { hasNativeDirectoryPicker, pickDirectory } from "./native-dialog";

export interface ExportModalResult {
  outputDir: string;
}

export class ExportConfirmModal extends Modal {
  private outputDir: string;
  private resolvePromise!: (result: ExportModalResult | null) => void;
  private settled = false;

  constructor(
    app: App,
    private readonly zipFileName: string,
    defaultOutputDir: string
  ) {
    super(app);
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
    contentEl.createEl("p", {
      cls: "share-markdown-zip-modal__hint",
      text: `Archive name: ${this.zipFileName}`
    });

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
      if (!this.outputDir) {
        return;
      }

      this.finish({
        outputDir: this.outputDir
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
