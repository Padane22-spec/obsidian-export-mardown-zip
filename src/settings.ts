import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ShareMarkdownZipPlugin from "./main";
import type { ShareMarkdownSettings } from "./export-types";
import { hasNativeDirectoryPicker, pickDirectory } from "./native-dialog";

export class ShareMarkdownSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ShareMarkdownZipPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    let currentValue = this.plugin.settings.defaultOutputDir;

    const outputDirSetting = new Setting(containerEl)
      .setName("Default output directory")
      .setDesc("Absolute folder path used when exporting notes to zip.");

    outputDirSetting.addText((text) =>
        text
          .setPlaceholder("/users/you/exports")
          .setValue(this.plugin.settings.defaultOutputDir)
          .onChange(async (value) => {
            currentValue = value.trim();
            this.plugin.settings.defaultOutputDir = currentValue;
            await this.plugin.saveSettings();
          })
      );

    outputDirSetting.addButton((button) =>
      button
        .setButtonText("Browse...")
        .setDisabled(!hasNativeDirectoryPicker())
        .onClick(async () => {
          const selectedDirectory = await pickDirectory(
            currentValue,
            "Choose default export directory"
          );
          if (!selectedDirectory) {
            if (!hasNativeDirectoryPicker()) {
              new Notice("Native directory picker is unavailable in this Obsidian build.");
            }
            return;
          }

          currentValue = selectedDirectory;
          this.plugin.settings.defaultOutputDir = selectedDirectory;
          await this.plugin.saveSettings();
          this.display();
        })
    );

    new Setting(containerEl)
      .setName("Prompt before exporting")
      .setDesc("Allow changing the output directory before each export.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.promptForOutputDirOnExport)
          .onChange(async (value) => {
            this.plugin.settings.promptForOutputDirOnExport = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

export function mergeSettings(
  defaults: ShareMarkdownSettings,
  partial: Partial<ShareMarkdownSettings> | null | undefined
): ShareMarkdownSettings {
  return {
    ...defaults,
    ...partial
  };
}
