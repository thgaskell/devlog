import { assertEquals, assertStringIncludes } from "@std/assert";
import { StopCommand } from "./stop.ts";
import type { FileOperations } from "./start.ts";

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

Deno.test("StopCommand - should stop active session and log outcome", async () => {
  const mockFileOps = new MockFileOperations();
  const stopCommand = new StopCommand(mockFileOps);
  
  // Set up existing active session
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    type: "start",
    message: "Working on auth",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await stopCommand.execute("Auth flow completed", "/path/to/project", "/tmp");
  
  assertStringIncludes(result, 'Stopped session: "Auth flow completed"');
  assertStringIncludes(result, "duration: 45m");
  
  const logContent = mockFileOps.getFileContent("/tmp/.devlog/sessions.jsonl");
  assertStringIncludes(logContent!, '"type":"stop"');
  assertStringIncludes(logContent!, '"message":"Auth flow completed"');
});

Deno.test("StopCommand - should handle no active session", async () => {
  const mockFileOps = new MockFileOperations();
  const stopCommand = new StopCommand(mockFileOps);
  
  const result = await stopCommand.execute("Trying to stop", "/path/to/project", "/tmp");
  
  assertEquals(result, "No active session to stop");
});

Deno.test("StopCommand - should handle already stopped session", async () => {
  const mockFileOps = new MockFileOperations();
  const stopCommand = new StopCommand(mockFileOps);
  
  // Set up start and stop for same project (session already closed)
  const existingLog = 
    JSON.stringify({
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      type: "start",
      message: "Working on task",
      project: "/path/to/project"
    }) + "\n" +
    JSON.stringify({
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: "stop",
      message: "Completed task",
      project: "/path/to/project"
    }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await stopCommand.execute("Trying to stop again", "/path/to/project", "/tmp");
  
  assertEquals(result, "No active session to stop");
});

Deno.test("StopCommand - should require message", async () => {
  const mockFileOps = new MockFileOperations();
  const stopCommand = new StopCommand(mockFileOps);
  
  const result = await stopCommand.execute("", "/path/to/project", "/tmp");
  
  assertEquals(result, "Error: Message is required for stop command");
});

Deno.test("StopCommand - should handle different project with active session", async () => {
  const mockFileOps = new MockFileOperations();
  const stopCommand = new StopCommand(mockFileOps);
  
  // Set up active session for different project
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    type: "start",
    message: "Other project task",
    project: "/path/to/other-project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await stopCommand.execute("No session for this project", "/path/to/project", "/tmp");
  
  assertEquals(result, "No active session to stop");
});

Deno.test("StopCommand - should calculate duration in hours and minutes", async () => {
  const mockFileOps = new MockFileOperations();
  const stopCommand = new StopCommand(mockFileOps);
  
  // Set up session started 2.5 hours ago
  const existingLog = JSON.stringify({
    timestamp: new Date(Date.now() - 150 * 60 * 1000).toISOString(), // 150 minutes ago
    type: "start",
    message: "Long task",
    project: "/path/to/project"
  }) + "\n";
  
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", existingLog);
  
  const result = await stopCommand.execute("Finally done", "/path/to/project", "/tmp");
  
  assertStringIncludes(result, "duration: 2h 30m");
});