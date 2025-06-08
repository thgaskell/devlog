import type { PathConfig } from "./paths.ts";
import type { FileOperations, LogEntry } from "./types.ts";

export class StartCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(message: string, currentDir: string, paths: PathConfig): Promise<string> {
    if (!message.trim()) {
      return "Error: Message is required for start command";
    }

    // Check for active session
    const activeSession = await this.getActiveSession(paths.sessions, currentDir);
    if (activeSession) {
      const duration = this.calculateDuration(activeSession.timestamp);
      return `Warning: Active session already exists for this project.\nCurrent session: "${activeSession.message}" (started ${duration} ago)`;
    }

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: "start",
      message: message.trim(),
      project: currentDir
    };

    // Ensure directory exists
    await this.fileOps.ensureDir(paths.globalDir);

    // Append to log file
    const logLine = JSON.stringify(logEntry) + "\n";
    let existingContent = "";
    if (await this.fileOps.exists(paths.sessions)) {
      existingContent = await this.fileOps.readTextFile(paths.sessions);
    }
    await this.fileOps.writeTextFile(paths.sessions, existingContent + logLine);

    return `Started session: "${message}"`;
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