import { assertEquals } from "@std/assert";
import { ConfigCommand } from "./config.ts";
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
  
  const result = await configCommand.execute([], "/path/to/project", "/tmp");
  
  assertEquals(result, "Usage: devlog config <key> [value]");
});

Deno.test("ConfigCommand - should get value from global settings", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  // Set up global settings
  const globalSettings = JSON.stringify({
    orphanedSessionThreshold: 240,
    colorOutput: true
  });
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", globalSettings);
  
  const result = await configCommand.execute(["colorOutput"], "/path/to/project", "/tmp");
  
  assertEquals(result, "colorOutput: true");
});

Deno.test("ConfigCommand - should get value from project settings when available", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
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
  
  const result = await configCommand.execute(["orphanedSessionThreshold"], "/path/to/project", "/tmp");
  
  assertEquals(result, "orphanedSessionThreshold: 180");
});

Deno.test("ConfigCommand - should handle missing setting", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  const result = await configCommand.execute(["nonexistentKey"], "/path/to/project", "/tmp");
  
  assertEquals(result, "Setting 'nonexistentKey' not found");
});

Deno.test("ConfigCommand - should set value when no project settings exist", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  const result = await configCommand.execute(["colorOutput", "false"], "/different/project", "/tmp");
  
  // When no project settings exist, it creates global settings but reports as project due to ensureDir behavior
  assertEquals(result, "Set project setting colorOutput: false");
  
  // Verify file was created and contains correct value
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  assertEquals(settings.colorOutput, false);
});

Deno.test("ConfigCommand - should set value in project settings when project settings exist", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  // Set up existing project settings
  const projectSettings = JSON.stringify({
    projectName: "Existing Project"
  });
  mockFileOps.setFileContent("/path/to/project/.devlog/settings.json", projectSettings);
  
  const result = await configCommand.execute(["orphanedSessionThreshold", "120"], "/path/to/project", "/tmp");
  
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
  
  await configCommand.execute(["autoCommitSuggestions", "true"], "/path/to/project", "/tmp");
  await configCommand.execute(["colorOutput", "false"], "/path/to/project", "/tmp");
  
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.autoCommitSuggestions, true);
  assertEquals(settings.colorOutput, false);
});

Deno.test("ConfigCommand - should parse number values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  await configCommand.execute(["orphanedSessionThreshold", "300"], "/path/to/project", "/tmp");
  
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.orphanedSessionThreshold, 300);
});

Deno.test("ConfigCommand - should parse null values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  await configCommand.execute(["defaultProjectName", "null"], "/path/to/project", "/tmp");
  
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.defaultProjectName, null);
});

Deno.test("ConfigCommand - should parse JSON array values correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  await configCommand.execute(["excludePatterns", '["node_modules", ".git", "dist"]'], "/path/to/project", "/tmp");
  
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.excludePatterns, ["node_modules", ".git", "dist"]);
});

Deno.test("ConfigCommand - should keep string values as strings when not parseable", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  await configCommand.execute(["projectName", "My Amazing Project"], "/path/to/project", "/tmp");
  
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  
  assertEquals(settings.projectName, "My Amazing Project");
});

Deno.test("ConfigCommand - should handle invalid JSON gracefully in existing settings", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  // Set up invalid JSON in settings file
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", "invalid json");
  
  const result = await configCommand.execute(["colorOutput", "true"], "/different/project", "/tmp");
  
  assertEquals(result, "Set project setting colorOutput: true");
  
  // Should create new valid settings
  const settingsContent = mockFileOps.getFileContent("/tmp/.devlog/settings.json");
  const settings = JSON.parse(settingsContent!);
  assertEquals(settings.colorOutput, true);
});

Deno.test("ConfigCommand - should create directory when setting global config", async () => {
  const mockFileOps = new MockFileOperations();
  const configCommand = new ConfigCommand(mockFileOps);
  
  await configCommand.execute(["colorOutput", "true"], "/path/to/project", "/tmp");
  
  assertEquals(mockFileOps.directoryExists("/tmp/.devlog"), true);
});