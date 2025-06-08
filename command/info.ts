import type { FileOperations } from "./types.ts";
import type { PathConfig } from "./paths.ts";

export class InfoCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(currentDir: string, paths: PathConfig): Promise<string> {
    const platform = this.getPlatformInfo();
    const pathsInfo = await this.getPathsInfo(paths);
    const environmentInfo = this.getEnvironmentInfo();
    const statusInfo = await this.getStatusInfo(paths);

    return [
      "DevLog System Information",
      "",
      `Platform: ${platform}`,
      `Current Directory: ${currentDir}`,
      "",
      "Resolved Paths:",
      pathsInfo,
      "",
      "Environment:",
      environmentInfo,
      "",
      "Status:",
      statusInfo
    ].join("\n");
  }

  private getPlatformInfo(): string {
    const os = Deno.build.os;
    const osNames: Record<string, string> = {
      "windows": "windows (Windows)",
      "darwin": "darwin (macOS)",
      "linux": "linux (Linux)"
    };
    return osNames[os] || os;
  }

  private async getPathsInfo(paths: PathConfig): Promise<string> {
    const pathEntries = [
      ["Global Directory", paths.globalDir],
      ["Project Directory", paths.projectDir],
      ["Global Settings", paths.globalSettings],
      ["Project Settings", paths.projectSettings],
      ["Sessions Log", paths.sessions]
    ];

    const pathLines: string[] = [];
    for (const [label, path] of pathEntries) {
      const exists = await this.fileOps.exists(path);
      const status = exists ? "✓" : "✗";
      const paddedLabel = label.padEnd(17); // 17 chars + 2 spaces = 19 total
      pathLines.push(`  ${paddedLabel}  ${path} ${status}`);
    }

    return pathLines.join("\n");
  }

  private getEnvironmentInfo(): string {
    const envVars: string[] = [];
    
    if (Deno.build.os === "windows") {
      const userProfile = this.safeGetEnv("USERPROFILE");
      const homeDrive = this.safeGetEnv("HOMEDRIVE");
      const homePath = this.safeGetEnv("HOMEPATH");
      
      if (userProfile) envVars.push(`  USERPROFILE: ${userProfile}`);
      if (homeDrive) envVars.push(`  HOMEDRIVE: ${homeDrive}`);
      if (homePath) envVars.push(`  HOMEPATH: ${homePath}`);
    } else {
      const home = this.safeGetEnv("HOME");
      if (home) envVars.push(`  HOME: ${home}`);
    }

    return envVars.length > 0 ? envVars.join("\n") : "  No relevant environment variables accessible";
  }

  private async getStatusInfo(paths: PathConfig): Promise<string> {
    const projectInitialized = await this.fileOps.exists(paths.projectSettings);
    const globalSettingsExist = await this.fileOps.exists(paths.globalSettings);
    const sessionsLogExists = await this.fileOps.exists(paths.sessions);

    const statusLines = [
      `  Project Initialized: ${projectInitialized ? "Yes" : "No"}`,
      `  Global Settings: ${globalSettingsExist ? "Configured" : "Default"}`,
      `  Sessions Log: ${sessionsLogExists ? "Available" : "None"}`
    ];

    return statusLines.join("\n");
  }

  private safeGetEnv(key: string): string | undefined {
    try {
      return Deno.env.get(key);
    } catch {
      return undefined;
    }
  }
}