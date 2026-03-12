type OpenDialogOptions = {
  title?: string;
  defaultPath?: string;
  properties: string[];
};

type OpenDialogResult = {
  canceled: boolean;
  filePaths: string[];
};

type DialogApi = {
  showOpenDialog(
    browserWindow: unknown,
    options: OpenDialogOptions
  ): Promise<OpenDialogResult>;
};

type BrowserWindowApi = {
  getFocusedWindow?: () => unknown;
};

type ElectronLikeModule = {
  dialog?: DialogApi;
  BrowserWindow?: BrowserWindowApi;
  remote?: {
    dialog?: DialogApi;
    BrowserWindow?: BrowserWindowApi;
  };
};

type ElectronRemoteModule = {
  dialog?: DialogApi;
  BrowserWindow?: BrowserWindowApi;
};

type WindowWithRequire = Window & {
  require?: NodeJS.Require;
};

type NativeDialogHandle = {
  dialog: DialogApi;
  browserWindow?: BrowserWindowApi;
};

export async function pickDirectory(
  defaultPath = "",
  title = "Choose export directory"
): Promise<string | null> {
  const handle = loadNativeDialog();
  if (!handle) {
    return null;
  }

  const result = await handle.dialog.showOpenDialog(
    handle.browserWindow?.getFocusedWindow?.() ?? undefined,
    {
      title,
      defaultPath: defaultPath || undefined,
      properties: ["openDirectory", "createDirectory", "promptToCreate"]
    }
  );

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0] ?? null;
}

export function hasNativeDirectoryPicker(): boolean {
  return loadNativeDialog() !== null;
}

function loadNativeDialog(): NativeDialogHandle | null {
  const localRequire = (window as WindowWithRequire).require;
  if (!localRequire) {
    return null;
  }

  // Obsidian desktop builds do not expose a single stable dialog entry point across all
  // Electron versions, so we probe the common variants in order.
  try {
    const electron = localRequire("electron") as ElectronLikeModule;
    if (electron.dialog) {
      return {
        dialog: electron.dialog,
        browserWindow: electron.BrowserWindow
      };
    }

    if (electron.remote?.dialog) {
      return {
        dialog: electron.remote.dialog,
        browserWindow: electron.remote.BrowserWindow
      };
    }
  } catch {
    // Fall through to @electron/remote.
  }

  try {
    // Older/community builds may still expose the dialog API through @electron/remote.
    const remote = localRequire("@electron/remote") as ElectronRemoteModule;
    if (remote.dialog) {
      return {
        dialog: remote.dialog,
        browserWindow: remote.BrowserWindow
      };
    }
  } catch {
    return null;
  }

  return null;
}
