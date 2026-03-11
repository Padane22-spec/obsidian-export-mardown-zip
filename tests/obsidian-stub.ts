export class FileSystemAdapter {
  getBasePath(): string {
    return "";
  }
}

export class Notice {
  constructor(_message: string) {}
}

export class Plugin {}

export class PluginSettingTab {
  containerEl = {
    empty() {}
  };

  constructor(public app: unknown, public plugin: unknown) {}
}

export class Setting {
  components: unknown[] = [];

  constructor(_containerEl: unknown) {}

  setName(_name: string): this {
    return this;
  }

  setDesc(_description: string): this {
    return this;
  }

  addText(callback: (component: TextComponent) => void): this {
    const component = new TextComponent();
    this.components.push(component);
    callback(component);
    return this;
  }

  addToggle(callback: (component: ToggleComponent) => void): this {
    const component = new ToggleComponent();
    this.components.push(component);
    callback(component);
    return this;
  }

  addButton(callback: (component: ButtonComponent) => void): this {
    const component = new ButtonComponent();
    this.components.push(component);
    callback(component);
    return this;
  }
}

export class Modal {
  contentEl = {
    empty() {},
    createEl(_tag: string, _attrs?: Record<string, string>) {
      return {
        addEventListener() {}
      };
    },
    createDiv() {
      return {
        createEl() {
          return {
            addEventListener() {}
          };
        }
      };
    }
  };

  constructor(public app: unknown) {}

  open(): void {}
  close(): void {}
}

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";
}

export const Platform = {
  isDesktopApp: true
};

export function normalizePath(input: string): string {
  return input.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

export class TextComponent {
  private value = "";

  setPlaceholder(_value: string): this {
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  onChange(_callback: (value: string) => void): this {
    return this;
  }
}

class ToggleComponent {
  setValue(_value: boolean): this {
    return this;
  }

  onChange(_callback: (value: boolean) => void): this {
    return this;
  }
}

class ButtonComponent {
  setButtonText(_value: string): this {
    return this;
  }

  setDisabled(_value: boolean): this {
    return this;
  }

  onClick(_callback: () => void | Promise<void>): this {
    return this;
  }
}
