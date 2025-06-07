#!/usr/bin/env deno run

import { StartCommand } from "./command/start.ts";
import { StopCommand } from "./command/stop.ts";
import { StatusCommand } from "./command/status.ts";
import { InitCommand } from "./command/init.ts";
import { ConfigCommand } from "./command/config.ts";
import type { FileOperations } from "./command/start.ts";

class DenoFileOperations implements FileOperations {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    await Deno.writeTextFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDir(path: string): Promise<void> {
    try {
      await Deno.mkdir(path, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }
  }
}

function showUsage(): void {
  console.log(`DevLog CLI - Development Session Logger

Usage:
  devlog <command>

Commands:
  start <message>    Log development intention and start session
  stop <message>     Log development outcome and end session
  status             Show current session status and duration
  init               Initialize project-specific settings
  config <key>       Get configuration value
  config <key> <val> Set configuration value
  help               Show this usage information

Examples:
  devlog start "Working on user authentication"
  devlog stop "Login flow complete, need error handling"
  devlog status
  devlog init
  devlog config colorOutput
  devlog config orphanedSessionThreshold 180

Data Storage:
  Global logs:     ~/.devlog/sessions.jsonl
  Global settings: ~/.devlog/settings.json
  Project settings: .devlog/settings.json (in project root)

For more information, see FEATURES.md`);
}

async function main(): Promise<void> {
  const args = Deno.args;
  
  if (args.length === 0) {
    showUsage();
    Deno.exit(1);
  }

  const command = args[0];
  const currentDir = Deno.cwd();
  const fileOps = new DenoFileOperations();

  try {
    switch (command) {
      case "start": {
        if (args.length < 2) {
          console.error("Error: Message is required for start command");
          console.error("Usage: devlog start <message>");
          Deno.exit(1);
        }
        const message = args.slice(1).join(" ");
        const startCommand = new StartCommand(fileOps);
        const result = await startCommand.execute(message, currentDir);
        console.log(result);
        break;
      }

      case "stop": {
        if (args.length < 2) {
          console.error("Error: Message is required for stop command");
          console.error("Usage: devlog stop <message>");
          Deno.exit(1);
        }
        const message = args.slice(1).join(" ");
        const stopCommand = new StopCommand(fileOps);
        const result = await stopCommand.execute(message, currentDir);
        console.log(result);
        break;
      }

      case "status": {
        const statusCommand = new StatusCommand(fileOps);
        const result = await statusCommand.execute(currentDir);
        console.log(result);
        break;
      }

      case "init": {
        const initCommand = new InitCommand(fileOps);
        const result = await initCommand.execute(currentDir);
        console.log(result);
        break;
      }

      case "config": {
        if (args.length < 2) {
          console.error("Error: Key is required for config command");
          console.error("Usage: devlog config <key> [value]");
          Deno.exit(1);
        }
        const configArgs = args.slice(1);
        const configCommand = new ConfigCommand(fileOps);
        const result = await configCommand.execute(configArgs, currentDir);
        console.log(result);
        break;
      }

      case "help":
      case "--help":
      case "-h": {
        showUsage();
        break;
      }

      default: {
        console.error(`Error: Unknown command '${command}'`);
        console.error("Run 'devlog help' for usage information");
        Deno.exit(1);
      }
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}