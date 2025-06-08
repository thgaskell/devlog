import type { FileOperations, LogEntry } from "./types.ts";
import type { PathConfig } from "./paths.ts";

export class StopCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(message: string, currentDir: string, paths: PathConfig): Promise<string> {
    if (!message.trim()) {
      return "Error: Message is required for stop command";
    }
    
    // Check for active session
    const activeSession = await this.getActiveSession(paths.sessions, currentDir);
    if (!activeSession) {
      return "No active session to stop";
    }

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: "stop",
      message: message.trim(),
      project: currentDir
    };

    // Append to log file
    const logLine = JSON.stringify(logEntry) + "\n";
    const existingContent = await this.fileOps.readTextFile(paths.sessions);
    await this.fileOps.writeTextFile(paths.sessions, existingContent + logLine);

    const duration = this.calculateDuration(activeSession.timestamp);
    return `Stopped session: "${message}" (duration: ${duration})`;
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
}