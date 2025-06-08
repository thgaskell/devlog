import { assertEquals, assertStringIncludes } from "@std/assert";
import { StatusCommand } from "./status.ts";
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

Deno.test("StatusCommand - should show no active session when none exists", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertEquals(result, "No active session");
});

Deno.test("StatusCommand - should show active session details", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up active session
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    type: "start",
    message: "Working on authentication",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertStringIncludes(result, 'Active session: "Working on authentication"');
  assertStringIncludes(result, "Duration: 30m");
  assertStringIncludes(result, "Project: /path/to/project");
});

Deno.test("StatusCommand - should warn about orphaned sessions with default threshold", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up session started 5 hours ago (exceeds default 4h threshold)
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(), // 300 minutes = 5 hours ago
    type: "start",
    message: "Long running task",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertStringIncludes(result, "⚠️  Warning: Session has been active for 5h 0m");
  assertStringIncludes(result, ">4h threshold");
});

Deno.test("StatusCommand - should use custom orphaned threshold from settings", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up custom settings with 2 hour threshold
  const settings = JSON.stringify({
    orphanedSessionThreshold: 120, // 2 hours
    colorOutput: true
  });
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", settings);
  
  // Set up session started 3 hours ago (exceeds 2h custom threshold)
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(), // 180 minutes = 3 hours ago
    type: "start",
    message: "Task with custom threshold",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertStringIncludes(result, "⚠️  Warning: Session has been active for 3h 0m");
  assertStringIncludes(result, ">2h threshold");
});

Deno.test("StatusCommand - should not warn when session is under threshold", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up session started 1 hour ago (under default 4h threshold)
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 60 minutes = 1 hour ago
    type: "start",
    message: "Recent task",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertStringIncludes(result, "Duration: 1h 0m");
  assertEquals(result.includes("Warning"), false);
});

Deno.test("StatusCommand - should handle closed sessions correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up start and stop for same project (session closed)
  const existingLog = 
    JSON.stringify({
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2 hours ago
      type: "start",
      message: "Working on task",
      project: "/path/to/project"
    }) + "\n" +
    JSON.stringify({
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      type: "stop",
      message: "Completed task",
      project: "/path/to/project"
    }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertEquals(result, "No active session");
});

Deno.test("StatusCommand - should handle invalid JSON in log file", async () => {
  const mockFileOps = new MockFileOperations();
  const statusCommand = new StatusCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up log with invalid JSON line mixed with valid line
  const existingLog = 
    "invalid json line\n" +
    JSON.stringify({
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: "start",
      message: "Valid entry",
      project: "/path/to/project"
    }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await statusCommand.execute("/path/to/project", paths);
  
  assertStringIncludes(result, 'Active session: "Valid entry"');
  assertStringIncludes(result, "Duration: 30m");
});