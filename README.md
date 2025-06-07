# DevLog CLI

A frictionless development session logger that helps you track work intentions and outcomes, creating natural breakpoints for reflection and git commits.

## Features

- **Session Tracking**: Log start/stop intentions with timestamps
- **Project Context**: Automatic project detection via working directory
- **Orphaned Session Detection**: Warnings for sessions >4 hours (configurable)
- **Settings Management**: Global and project-specific configuration
- **Duration Tracking**: Automatic session duration calculation
- **Multiple Projects**: Support for concurrent sessions across different projects

## Prerequisites

- [Deno](https://deno.land/) 2.0 or later

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devlog
   ```

2. **Install dependencies**
   ```bash
   # Dependencies are automatically resolved by Deno
   # No separate install step required
   ```

3. **Run tests**
   ```bash
   deno task test
   ```

4. **Development mode** (with file watching)
   ```bash
   deno task dev help
   ```

5. **Build executable binary**
   ```bash
   deno task build
   ```

## Usage

### Development Commands

```bash
# Run tests
deno task test

# Start development server with file watching
deno task dev <command>

# Build executable binary
deno task build

# Run CLI directly (for development)
deno task run <command>
```

### CLI Commands

After building the binary (`deno task build`), you can use the CLI:

```bash
# Start a development session
./devlog start "Working on user authentication"

# Check current session status
./devlog status

# Stop the current session
./devlog stop "Login flow complete, need error handling"

# Initialize project settings
./devlog init

# Configure settings
./devlog config colorOutput true
./devlog config orphanedSessionThreshold 180
```

### Installation (Optional)

To make the CLI available system-wide:

```bash
# Build the binary
deno task build

# Move to PATH
sudo mv devlog /usr/local/bin/

# Now use from anywhere
devlog start "Working on new feature"
```

## Data Storage

- **Global logs**: `~/.devlog/sessions.jsonl`
- **Global settings**: `~/.devlog/settings.json`
- **Project settings**: `.devlog/settings.json` (in project root)

## Configuration

### Global Settings
```json
{
  "orphanedSessionThreshold": 240,
  "defaultProjectName": null,
  "timestampFormat": "iso",
  "colorOutput": true
}
```

### Project Settings
```json
{
  "projectName": "My Project",
  "orphanedSessionThreshold": 180,
  "autoCommitSuggestions": true,
  "excludePatterns": ["node_modules", ".git"]
}
```

## Development

### Project Structure

```
devlog/
├── main.ts                    # CLI entry point
├── command/                   # Command implementations
│   ├── start.ts               # Start session command
│   ├── stop.ts                # Stop session command
│   ├── status.ts              # Session status command
│   ├── init.ts                # Project initialization
│   ├── config.ts              # Configuration management
│   └── *_test.ts              # Unit tests for each command
├── deno.json                  # Deno configuration and tasks
└── FEATURES.md                # Detailed feature specifications
```

### Running Tests

The project includes comprehensive unit tests (36 tests) that use I/O stubbing:

```bash
# Run all tests
deno task test

# Run tests with specific file pattern
deno test command/start_test.ts
```

### Architecture

- **Command Pattern**: Each CLI command is a separate class
- **Dependency Injection**: File operations are injected for testing
- **I/O Stubbing**: Tests use mocked file operations
- **TypeScript**: Full type safety throughout the codebase

