import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import type { App, TFile } from "obsidian";
import { writeExportZip } from "../src/zip-writer";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
    })
  );
});

describe("writeExportZip", () => {
  it("writes markdown and assets under the zip root folder", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "share-markdown-zip-"));
    tempDirs.push(outputDir);

    const app = {
      vault: {
        readBinary: async () => new Uint8Array([1, 2, 3]).buffer
      }
    } as unknown as App;

    const zipPath = await writeExportZip(
      app,
      {
        rootFile: { basename: "A" } as TFile,
        zipRootName: "custom-name",
        markdownFiles: new Map(),
        assetFiles: new Map([["assets/image.png", { path: "assets/image.png" } as TFile]]),
        skippedLinks: 0
      },
      [
        {
          filePath: "A.md",
          content: "[B](./B.md)",
          skippedLinks: 0
        }
      ],
      outputDir
    );

    const buffer = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.keys(zip.files).sort();

    expect(entries).toEqual([
      "custom-name/",
      "custom-name/A.md",
      "custom-name/assets/",
      "custom-name/assets/image.png"
    ]);
    expect(path.basename(zipPath)).toBe("custom-name.zip");
  });
});
