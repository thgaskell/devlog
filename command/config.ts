import { join } from "jsr:@std/path";
import type { FileOperations } from "./start.ts";
import type { Settings } from "./status.ts";
import type { ProjectSettings } from "./init.ts";

export class ConfigCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(args: string[], currentDir: string, homeDir = Deno.env.get("HOME") || ""): Promise<string> {
    if (args.length === 0) {
      return "Usage: devlog config <key> [value]";
    }

    const key = args[0];
    const value = args[1];

    const globalSettingsPath = join(homeDir, ".devlog", "settings.json");
    const projectSettingsPath = join(currentDir, ".devlog", "settings.json");

    // Check if project-specific settings exist first
    const useProjectSettings = await this.fileOps.exists(projectSettingsPath);
    const settingsPath = useProjectSettings ? projectSettingsPath : globalSettingsPath;

    if (value === undefined) {
      // Get value
      return await this.getValue(settingsPath, key);
    } else {
      // Set value
      return await this.setValue(settingsPath, key, value);
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

  private async setValue(settingsPath: string, key: string, value: string): Promise<string> {
    // Ensure directory exists
    const settingsDir = settingsPath.split("/").slice(0, -1).join("/");
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

    const settingsType = settingsPath.includes("/.devlog/settings.json") ? "project" : "global";
    return `Set ${settingsType} setting ${key}: ${JSON.stringify(parsedValue)}`;
  }
}