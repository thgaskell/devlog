import { join } from "jsr:@std/path";
import type { FileOperations } from "./start.ts";

export interface ProjectSettings {
  projectName?: string | null;
  orphanedSessionThreshold?: number;
  autoCommitSuggestions?: boolean;
  excludePatterns?: string[];
}

export class InitCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(currentDir: string): Promise<string> {
    const devlogDir = join(currentDir, ".devlog");
    const settingsPath = join(devlogDir, "settings.json");
    
    // Check if already initialized
    if (await this.fileOps.exists(settingsPath)) {
      return "Already initialized";
    }

    // Create .devlog directory
    await this.fileOps.ensureDir(devlogDir);

    // Create default project settings
    const defaultSettings: ProjectSettings = {
      projectName: null,
      orphanedSessionThreshold: 180,
      autoCommitSuggestions: true,
      excludePatterns: ["node_modules", ".git"]
    };

    await this.fileOps.writeTextFile(settingsPath, JSON.stringify(defaultSettings, null, 2));

    return "Project initialized with default settings in .devlog/settings.json";
  }
}