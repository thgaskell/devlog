import type { FileOperations, LogEntry } from "./types.ts";
import type { PathConfig } from "./paths.ts";

export interface Settings {
  orphanedSessionThreshold?: number;
  defaultProjectName?: string | null;
  timestampFormat?: string;
  colorOutput?: boolean;
}

export class StatusCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(currentDir: string, paths: PathConfig): Promise<string> {
    // Load settings
    const settings = await this.loadSettings(paths.globalSettings);
    const orphanedThreshold = settings.orphanedSessionThreshold || 240; // 4 hours default
    
    // Check for active session
    const activeSession = await this.getActiveSession(paths.sessions, currentDir);
    if (!activeSession) {
      return "No active session";
    }

    const duration = this.calculateDuration(activeSession.timestamp);
    const durationMinutes = this.calculateDurationMinutes(activeSession.timestamp);
    
    let result = `Active session: "${activeSession.message}"\nDuration: ${duration}\nProject: ${currentDir}`;
    
    if (durationMinutes > orphanedThreshold) {
      result += `\n⚠️  Warning: Session has been active for ${duration} (>${Math.floor(orphanedThreshold/60)}h threshold)`;
    }

    return result;
  }

  private async loadSettings(settingsPath: string): Promise<Settings> {
    if (!await this.fileOps.exists(settingsPath)) {
      return {};
    }

    try {
      const content = await this.fileOps.readTextFile(settingsPath);
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async getActiveSession(sessionLogPath: string, currentProject: string): Promise<LogEntry | null> {
    if (!await this.fileOps.exists(sessionLogPath)) {
      return null;
    }

    const content = await this.fileOps.readTextFile(sessionLogPath);
    const lines = content.trim().split("\n").filter(line => line.trim());
    
    let lastStart: LogEntry | null = null;
    
    for (const line of lines) {
      try {
        const entry: LogEntry = JSON.parse(line);
        if (entry.project === currentProject) {
          if (entry.type === "start") {
            lastStart = entry;
          } else if (entry.type === "stop") {
            lastStart = null;
          }
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return lastStart;
  }

  private calculateDuration(startTime: string): string {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  private calculateDurationMinutes(startTime: string): number {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }
}