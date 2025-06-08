import { join } from "jsr:@std/path";

export interface PathConfig {
  globalDir: string;        // ~/.devlog
  projectDir: string;       // ./.devlog  
  globalSettings: string;   // ~/.devlog/settings.json
  projectSettings: string;  // ./.devlog/settings.json
  sessions: string;         // ~/.devlog/sessions.jsonl
}

/**
 * Resolves the user's home directory. Throws an error if unable to resolve.
 */
function resolveHomeDirectory(): string {
  if (Deno.build.os === "windows") {
    const userProfile = Deno.env.get("USERPROFILE");
    if (userProfile) return userProfile;
    
    const homeDrive = Deno.env.get("HOMEDRIVE");
    const homePath = Deno.env.get("HOMEPATH");
    if (homeDrive && homePath) return homeDrive + homePath;
    
    throw new Error("Cannot resolve home directory on Windows. USERPROFILE, HOMEDRIVE, and HOMEPATH are all unavailable.");
  } else {
    const home = Deno.env.get("HOME");
    if (home) return home;
    
    throw new Error("Cannot resolve home directory. HOME environment variable is not set.");
  }
}

/**
 * Creates a PathConfig object with all necessary DevLog paths resolved.
 * Throws an error if the home directory cannot be resolved.
 */
export function createPathConfig(currentDir: string): PathConfig {
  const homeDir = resolveHomeDirectory();
  const globalDir = join(homeDir, ".devlog");
  const projectDir = join(currentDir, ".devlog");
  
  return {
    globalDir,
    projectDir,
    globalSettings: join(globalDir, "settings.json"),
    projectSettings: join(projectDir, "settings.json"),
    sessions: join(globalDir, "sessions.jsonl")
  };
}