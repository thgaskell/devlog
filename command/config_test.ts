import { assertEquals } from "@std/assert";
import { ConfigCommand } from "./config.ts";
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

Deno.test("ConfigCommand - should show usage when no arguments provided", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await configCommand.execute([], paths);
  
  assertEquals(result, "Usage: devlog config <key> [value]");
});

Deno.test("ConfigCommand - should get value from global settings", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up global settings
  const globalSettings = JSON.stringify({
    orphanedSessionThreshold: 240,
    colorOutput: true
  });
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", globalSettings);
  
  const result = await configCommand.execute(["colorOutput"], paths);
  
  assertEquals(result, "colorOutput: true");
});

Deno.test("ConfigCommand - should get value from project settings when available", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up both global and project settings
  const globalSettings = JSON.stringify({
    orphanedSessionThreshold: 240,
    colorOutput: true
  });
  const projectSettings = JSON.stringify({
    orphanedSessionThreshold: 180,
    projectName: "My Project"
  });
  
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", globalSettings);
  mockFileOps.setFileContent("/path/to/project/.devlog/settings.json", projectSettings);
  
  const result = await configCommand.execute(["orphanedSessionThreshold"], paths);
  
  assertEquals(result, "orphanedSessionThreshold: 180");
});

Deno.test("ConfigCommand - should handle missing setting", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await configCommand.execute(["nonexistentKey"], paths);
  
  assertEquals(result, "Setting 'nonexistentKey' not found");
});

Deno.test("ConfigCommand - should set value when no project settings exist", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/different/project", "/tmp");
  
  const result = await configCommand.execute(["colorOutput", "false"], paths);
  
  // When no project settings exist, it creates project settings
  assertEquals(result, "Set project setting colorOutput: false");
  
  // Verify file was created and contains correct value
  const settingsContent = mockFileOps.getFileContent("/different/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  assertEquals(settings.colorOutput, false);
});

Deno.test("ConfigCommand - should set value in project settings when project settings exist", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up existing project settings
  const projectSettings = JSON.stringify({
    projectName: "Existing Project"
  });
  mockFileOps.setFileContent("/path/to/project/.devlog/settings.json", projectSettings);
  
  const result = await configCommand.execute(["orphanedSessionThreshold", "120"], paths);
  
  assertEquals(result, "Set project setting orphanedSessionThreshold: 120");
  
  // Verify project settings were updated
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  assertEquals(settings.orphanedSessionThreshold, 120);
  assertEquals(settings.projectName, "Existing Project");
});

Deno.test("ConfigCommand - should parse boolean values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await configCommand.execute(["autoCommitSuggestions", "true"], paths);
  await configCommand.execute(["colorOutput", "false"], paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.autoCommitSuggestions, true);
  assertEquals(settings.colorOutput, false);
});

Deno.test("ConfigCommand - should parse number values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await configCommand.execute(["orphanedSessionThreshold", "300"], paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.orphanedSessionThreshold, 300);
});

Deno.test("ConfigCommand - should parse null values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await configCommand.execute(["defaultProjectName", "null"], paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.defaultProjectName, null);
});

Deno.test("ConfigCommand - should parse JSON array values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await configCommand.execute(["excludePatterns", '["node_modules", ".git", "dist"]'], paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.excludePatterns, ["node_modules", ".git", "dist"]);
});

Deno.test("ConfigCommand - should keep string values as strings when not parseable", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await configCommand.execute(["projectName", "My Amazing Project"], paths);
  
  const settingsContent = mockFileOps.getFileContent("/path/to/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.projectName, "My Amazing Project");
});

Deno.test("ConfigCommand - should handle invalid JSON gracefully in existing settings", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/different/project", "/tmp");
  
  // Set up invalid JSON in settings file
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", "invalid json");
  
  const result = await configCommand.execute(["colorOutput", "true"], paths);
  
  assertEquals(result, "Set project setting colorOutput: true");
  
  // Should create new valid settings
  const settingsContent = mockFileOps.getFileContent("/different/project/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  assertEquals(settings.colorOutput, true);
});

Deno.test("ConfigCommand - should create directory when setting project config", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  await configCommand.execute(["colorOutput", "true"], paths);
  
  assertEquals(mockFileOps.directoryExists("/path/to/project/.devlog"), true);
});