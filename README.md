# Share Markdown Zip

Share Markdown Zip is an Obsidian desktop plugin that exports one Markdown note together with:

- recursively linked Markdown files
- local image and non-image attachments
- a rewritten Markdown graph that still works after extraction

The export is written as a single zip archive to a directory you choose or configure in plugin settings.

## Features

- Export the active note from the command palette.
- Export a note from the file context menu.
- Recursively follow Obsidian wiki links and Markdown links.
- Include local attachments such as images, PDFs, audio, and other linked files.
- Rewrite exported Markdown links to standard relative Markdown paths.
- Preserve vault-relative paths inside the zip under `<note-name>-export/`.

## Development

```bash
npm install
npm run build
npm test
```

## Notes

- Desktop only. `manifest.json` marks the plugin as desktop-only.
- Unresolved local links are left unchanged and counted in the export result.
- External URLs are preserved unchanged.
