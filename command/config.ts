import { dirname } from "jsr:@std/path";
import type { FileOperations } from "./types.ts";
import type { Settings } from "./status.ts";
import type { ProjectSettings } from "./init.ts";
import type { PathConfig } from "./paths.ts";

export class ConfigCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(args: string[], paths: PathConfig): Promise<string> {
    if (args.length === 0) {
      return "Usage: devlog config <key> [value]";
    }

    const key = args[0];
    const value = args[1];

    if (value === undefined) {
      // Get value - check project first, fall back to global
      const useProjectSettings = await this.fileOps.exists(paths.projectSettings);
      const settingsPath = useProjectSettings ? paths.projectSettings : paths.globalSettings;
      return await this.getValue(settingsPath, key);
    } else {
      // Set value - always use project settings
      return await this.setValue(paths.projectSettings, key, value, true);
    }
  }

  private async getValue(settingsPath: string, key: string): Promise<string> {
    if (!await this.fileOps.exists(settingsPath)) {
      return `Setting '${key}' not found`;
    }

    try {
      const content = await this.fileOps.readTextFile(settingsPath);
      const settings = JSON.parse(content);
      
      if (!(key in settings)) {
        return `Setting '${key}' not found`;
      }

      const value = settings[key];
      return `${key}: ${JSON.stringify(value)}`;
    } catch {
      return "Error reading settings file";
    }
  }

  private async setValue(settingsPath: string, key: string, value: string, isProjectSettings: boolean): Promise<string> {
    // Ensure directory exists
    const settingsDir = dirname(settingsPath);
    await this.fileOps.ensureDir(settingsDir);

    let settings: Settings | ProjectSettings = {};
    
    // Load existing settings
    if (await this.fileOps.exists(settingsPath)) {
      try {
        const content = await this.fileOps.readTextFile(settingsPath);
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }
    }

    // Parse value
    let parsedValue: string | number | boolean | null | object = value;
    if (value === "true") parsedValue = true;
    else if (value === "false") parsedValue = false;
    else if (value === "null") parsedValue = null;
    else if (!isNaN(Number(value))) parsedValue = Number(value);
    else if (value.startsWith("[") || value.startsWith("{")) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as string if invalid JSON
      }
    }

    (settings as Record<string, unknown>)[key] = parsedValue;

    await this.fileOps.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));

    const settingsType = isProjectSettings ? "project" : "global";
    return `Set ${settingsType} setting ${key}: ${JSON.stringify(parsedValue)}`;
  }
}