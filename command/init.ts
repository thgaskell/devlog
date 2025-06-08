import type { FileOperations } from "./types.ts";
import type { PathConfig } from "./paths.ts";

export interface ProjectSettings {
  projectName?: string | null;
  orphanedSessionThreshold?: number;
  autoCommitSuggestions?: boolean;
  excludePatterns?: string[];
}

export class InitCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(paths: PathConfig): Promise<string> {
    // Check if already initialized
    if (await this.fileOps.exists(paths.projectSettings)) {
      return "Already initialized";
    }

    // Create .devlog directory
    await this.fileOps.ensureDir(paths.projectDir);

    // Create default project settings
    const defaultSettings: ProjectSettings = {
      projectName: null,
      orphanedSessionThreshold: 180,
      autoCommitSuggestions: true,
      excludePatterns: ["node_modules", ".git"]
    };

    await this.fileOps.writeTextFile(paths.projectSettings, JSON.stringify(defaultSettings, null, 2));

    return "Project initialized with default settings in .devlog/settings.json";
  }
}