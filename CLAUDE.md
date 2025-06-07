# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a DevLog CLI application built with Deno and TypeScript. DevLog is a development session logger that helps developers track their work intentions and outcomes through start/stop commands, creating natural breakpoints for reflection and git commits.

## Development Commands

- **Run the application**: `deno task run <command>`
- **Run with file watching**: `deno task dev`
- **Run tests**: `deno task test`
- **Build executable**: `deno task build`

## Project Structure

- `main.ts` - Main CLI entry point with command routing and argument parsing
- `command/` - Individual command implementations with comprehensive unit tests
  - `start.ts` & `start_test.ts` - Log development intentions and start sessions
  - `stop.ts` & `stop_test.ts` - Log outcomes and end sessions
  - `status.ts` & `status_test.ts` - Show active session status and warnings
  - `init.ts` & `init_test.ts` - Initialize project-specific settings
  - `config.ts` & `config_test.ts` - Manage global and project configuration
- `deno.json` - Deno configuration with tasks, permissions, and import mappings
- `FEATURES.md` - Detailed feature specifications and requirements

## Architecture Notes

The project follows a command pattern where each CLI command is implemented as a separate class with dependency injection for file operations. This allows for comprehensive unit testing with mocked I/O operations. The CLI supports both global and project-specific settings, session tracking across multiple projects, and orphaned session detection.

## Testing

All commands have comprehensive unit tests (36 tests total) that use I/O stubbing to avoid file system dependencies. Tests cover all edge cases including error conditions, duration calculations, and settings hierarchy.