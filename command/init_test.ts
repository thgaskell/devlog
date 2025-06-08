import { assertEquals, assertStringIncludes } from "@std/assert";
import { InitCommand } from "./init.ts";
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

  directoryExists(path: string): boolean {
    return this.directories.has(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}

Deno.test("InitCommand - should initialize project with default settings", async () => {
  const mockFileOps = new MockFileOperations();
  const initCommand = new InitCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await initCommand.execute(paths);
  
  assertEquals(result, "Project initialized with default settings in .devlog/settings.json");
  
  // Check that .devlog directory was created
  assertEquals(mockFileOps.directoryExists("/path/to/project/.devlog"), true);
  
  // Check that settings file was created with correct content
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.projectName, null);
  assertEquals(settings.orphanedSessionThreshold, 180);
  assertEquals(settings.autoCommitSuggestions, true);
  assertEquals(settings.excludePatterns, ["node_modules", ".git"]);
});

Deno.test("InitCommand - should handle already initialized project", async () => {
  const mockFileOps = new MockFileOperations();
  const initCommand = new InitCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up existing settings file
  mockFileOps.setFileContent("/path/to/project/.devlog/settings.json", "{}");
  
  const result = await initCommand.execute(paths);
  
  assertEquals(result, "Already initialized");
});

Deno.test("InitCommand - should create valid JSON settings file", async () => {
  const mockFileOps = new MockFileOperations();
  const initCommand = new InitCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await initCommand.execute(paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  
  // Should be valid JSON
  const settings = JSON.parse(settingsContent!);
  
  // Should have all expected properties
  assertEquals(typeof settings.projectName, "object"); // null
  assertEquals(typeof settings.orphanedSessionThreshold, "number");
  assertEquals(typeof settings.autoCommitSuggestions, "boolean");
  assertEquals(Array.isArray(settings.excludePatterns), true);
});

Deno.test("InitCommand - should create formatted JSON with proper indentation", async () => {
  const mockFileOps = new MockFileOperations();
  const initCommand = new InitCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await initCommand.execute(paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  
  // Should be formatted with 2-space indentation (contains newlines and spaces)
  assertStringIncludes(settingsContent!, "{\n  ");
  assertStringIncludes(settingsContent!, '"projectName": null');
  assertStringIncludes(settingsContent!, '"orphanedSessionThreshold": 180');
});

Deno.test("InitCommand - should work with different project paths", async () => {
  const mockFileOps = new MockFileOperations();
  const initCommand = new InitCommand(mockFileOps);
  const paths1 = createTestPaths("/home/user/project1", "/tmp");
  const paths2 = createTestPaths("/home/user/project2", "/tmp");
  
  const result1 = await initCommand.execute(paths1);
  const result2 = await initCommand.execute(paths2);
  
  assertEquals(result1, "Project initialized with default settings in .devlog/settings.json");
  assertEquals(result2, "Project initialized with default settings in .devlog/settings.json");
  
  // Both projects should have their own settings
  assertEquals(mockFileOps.getFileContent("/home/user/project1/.devlog/settings.json") !== undefined, true);
  assertEquals(mockFileOps.getFileContent("/home/user/project2/.devlog/settings.json") !== undefined, true);
  assertEquals(mockFileOps.directoryExists("/home/user/project1/.devlog"), true);
  assertEquals(mockFileOps.directoryExists("/home/user/project2/.devlog"), true);
});