export interface FileOperations {
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
}

export interface LogEntry {
  timestamp: string;
  type: "start" | "stop";
  message: string;
  project: string;
}