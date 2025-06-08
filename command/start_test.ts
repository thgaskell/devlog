import { assertEquals, assertStringIncludes } from "@std/assert";
import { StartCommand } from "./start.ts";
import type { FileOperations } from "./types.ts";
import type { PathConfig } from "./paths.ts";

function createTestPaths(projectDir: string, homeDir: string): PathConfig {
  return {
    globalDir: `${homeDir}/.devlog`,
    projectDir: `${projectDir}/.devlog`,
    globalSettings: `${homeDir}/.devlog/settings.json`,
    projectSettings: `${projectDir}/.devlog/settings.json`,
    sessions: `${homeDir}/.devlog/sessions.jsonl`
  };
}

class MockFileOperations implements FileOperations {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  readTextFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return Promise.resolve(content);
  }

  writeTextFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    return Promise.resolve();
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path) || this.directories.has(path));
  }

  ensureDir(path: string): Promise<void> {
    this.directories.add(path);
    return Promise.resolve();
  }

  // Test helpers
  getFileContent(path: string): string | undefined {
    return this.files.get(path);
  }

  setFileContent(path: string, content: string): void {
    this.files.set(path, content);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}

Deno.test("StartCommand - should create new session when no active session exists", async () => {
  const mockFileOps = new MockFileOperations();
  const startCommand = new StartCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await startCommand.execute("Working on user auth", "/path/to/project", paths);
  
  assertEquals(result, 'Started session: "Working on user auth"');
  
  const logContent = mockFileOps.getFileContent("/tmp/.devlog/sessions.jsonl");
  assertStringIncludes(logContent!, '"type":"start"');
  assertStringIncludes(logContent!, '"message":"Working on user auth"');
  assertStringIncludes(logContent!, '"project":"/path/to/project"');
});

Deno.test("StartCommand - should warn when active session exists", async () => {
  const mockFileOps = new MockFileOperations();
  const startCommand = new StartCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up existing active session
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    type: "start",
    message: "Previous task",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await startCommand.execute("New task", "/path/to/project", paths);
  
  assertStringIncludes(result, "Warning: Active session already exists");
  assertStringIncludes(result, "Previous task");
  assertStringIncludes(result, "30m ago");
});

Deno.test("StartCommand - should allow start for different projects", async () => {
  const mockFileOps = new MockFileOperations();
  const startCommand = new StartCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up existing active session for different project
  const existingLog = JSON.stringify({
    timestamp: new Date().toISOString(),
    type: "start",
    message: "Other project task",
    project: "/path/to/other-project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await startCommand.execute("New project task", "/path/to/project", paths);
  
  assertEquals(result, 'Started session: "New project task"');
});

Deno.test("StartCommand - should require message", async () => {
  const mockFileOps = new MockFileOperations();
  const startCommand = new StartCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await startCommand.execute("", "/path/to/project", paths);
  
  assertEquals(result, "Error: Message is required for start command");
});

Deno.test("StartCommand - should handle closed sessions correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const startCommand = new StartCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up start and stop for same project
  const existingLog = 
    JSON.stringify({
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      type: "start",
      message: "Previous task",
      project: "/path/to/project"
    }) + "\n" +
    JSON.stringify({
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      type: "stop",
      message: "Completed task",
      project: "/path/to/project"
    }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await startCommand.execute("New task", "/path/to/project", paths);
  
  assertEquals(result, 'Started session: "New task"');
});