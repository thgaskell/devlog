import { assertEquals, assertStringIncludes } from "@std/assert";
import { InfoCommand } from "./info.ts";
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

Deno.test("InfoCommand - should show system information with basic paths", async () => {
  const mockFileOps = new MockFileOperations();
  const infoCommand = new InfoCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await infoCommand.execute("/path/to/project", paths);
  
  // Should include header
  assertStringIncludes(result, "DevLog System Information");
  
  // Should include platform info
  assertStringIncludes(result, "Platform:");
  
  // Should include current directory
  assertStringIncludes(result, "Current Directory: /path/to/project");
  
  // Should include all path types
  assertStringIncludes(result, "Global Directory");
  assertStringIncludes(result, "Project Directory");
  assertStringIncludes(result, "Global Settings");
  assertStringIncludes(result, "Project Settings");
  assertStringIncludes(result, "Sessions Log");
  
  // Should include environment section
  assertStringIncludes(result, "Environment:");
  
  // Should include status section
  assertStringIncludes(result, "Status:");
});

Deno.test("InfoCommand - should show file existence status correctly", async () => {
  const mockFileOps = new MockFileOperations();
  const infoCommand = new InfoCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Set up some existing files
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", "{}");
  mockFileOps.setFileContent("/path/to/project/.devlog/settings.json", "{}");
  
  const result = await infoCommand.execute("/path/to/project", paths);
  
  // Should show checkmarks for existing files
  assertStringIncludes(result, "/tmp/.devlog/sessions.jsonl ✓");
  assertStringIncludes(result, "/path/to/project/.devlog/settings.json ✓");
  
  // Should show X marks for non-existing files
  assertStringIncludes(result, "/tmp/.devlog/settings.json ✗");
  assertStringIncludes(result, "/path/to/project/.devlog ✗");
});

Deno.test("InfoCommand - should show correct initialization status", async () => {
  const mockFileOps = new MockFileOperations();
  const infoCommand = new InfoCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  // Test uninitialized project
  let result = await infoCommand.execute("/path/to/project", paths);
  assertStringIncludes(result, "Project Initialized: No");
  assertStringIncludes(result, "Global Settings: Default");
  assertStringIncludes(result, "Sessions Log: None");
  
  // Set up initialized project
  mockFileOps.setFileContent("/path/to/project/.devlog/settings.json", "{}");
  mockFileOps.setFileContent("/tmp/.devlog/settings.json", "{}");
  mockFileOps.setFileContent("/tmp/.devlog/sessions.jsonl", "");
  
  result = await infoCommand.execute("/path/to/project", paths);
  assertStringIncludes(result, "Project Initialized: Yes");
  assertStringIncludes(result, "Global Settings: Configured");
  assertStringIncludes(result, "Sessions Log: Available");
});

Deno.test("InfoCommand - should show path labels with consistent formatting", async () => {
  const mockFileOps = new MockFileOperations();
  const infoCommand = new InfoCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await infoCommand.execute("/path/to/project", paths);
  
  // All path labels should be properly padded for alignment
  assertStringIncludes(result, "  Global Directory   ");
  assertStringIncludes(result, "  Project Directory  ");
  assertStringIncludes(result, "  Global Settings    ");
  assertStringIncludes(result, "  Project Settings   ");
  assertStringIncludes(result, "  Sessions Log       ");
});

Deno.test("InfoCommand - should include environment variables section", async () => {
  const mockFileOps = new MockFileOperations();
  const infoCommand = new InfoCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await infoCommand.execute("/path/to/project", paths);
  
  // Should have environment section
  assertStringIncludes(result, "Environment:");
  
  // Should show either HOME (Unix) or Windows variables, or fallback message
  const hasHomeVar = result.includes("HOME:");
  const hasWindowsVars = result.includes("USERPROFILE:") || result.includes("HOMEDRIVE:");
  const hasFallback = result.includes("No relevant environment variables accessible");
  
  // At least one of these should be present
  assertEquals(hasHomeVar || hasWindowsVars || hasFallback, true);
});

Deno.test("InfoCommand - should show platform information", async () => {
  const mockFileOps = new MockFileOperations();
  const infoCommand = new InfoCommand(mockFileOps);
  const paths = createTestPaths("/path/to/project", "/tmp");
  
  const result = await infoCommand.execute("/path/to/project", paths);
  
  // Should show platform info (will vary by test environment)
  assertStringIncludes(result, "Platform:");
  
  // Should be one of the expected platforms
  const hasDarwin = result.includes("darwin (macOS)");
  const hasLinux = result.includes("linux (Linux)");
  const hasWindows = result.includes("windows (Windows)");
  
  assertEquals(hasDarwin || hasLinux || hasWindows, true);
});