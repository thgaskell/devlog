import { join } from "jsr:@std/path";

export interface LogEntry {
  timestamp: string;
  type: "start" | "stop";
  message: string;
  project: string;
}

export interface FileOperations {
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
}

export class StartCommand {
  constructor(private fileOps: FileOperations) {}

  async execute(message: string, currentDir: string, homeDir = Deno.env.get("HOME") || ""): Promise<string> {
    if (!message.trim()) {
      return "Error: Message is required for start command";
    }

    const sessionLogPath = join(homeDir, ".devlog", "sessions.jsonl");
    
    // Check for active session
    const activeSession = await this.getActiveSession(sessionLogPath, currentDir);
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
    await this.fileOps.ensureDir(join(homeDir, ".devlog"));

    // Append to log file
    const logLine = JSON.stringify(logEntry) + "\n";
    let existingContent = "";
    if (await this.fileOps.exists(sessionLogPath)) {
      existingContent = await this.fileOps.readTextFile(sessionLogPath);
    }
    await this.fileOps.writeTextFile(sessionLogPath, existingContent + logLine);

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