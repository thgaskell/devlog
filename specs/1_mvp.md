# DevLog CLI Tool - Technical Specification

## Problem Statement

Need a frictionless way to log development intentions and outcomes without
interfering with actual development work. Current challenges:

- Difficulty finding start/stop points for reflection
- Going weeks without git commits due to lack of clear breakpoints
- Want documentation that enhances productivity rather than slowing it down

## Solution Overview

A CLI tool that implements "micro-documentation" through intention logging and
exit tickets, similar to a development-focused Pomodoro timer.

## Core Workflow

1. **Intention Log**: Before coding, log what you're trying to accomplish
2. **Exit Ticket**: When stopping, log current state/progress
3. **Natural Breakpoints**: Creates commit triggers and reflection points

## Technical Requirements

### Platform & Technology

- **Runtime**: Deno 2.0
- **Type**: CLI application in PATH
- **Distribution**: Single binary
- **Voice Input**: Leverage system dictation (not built into app)

### Core Commands

#### `devlog start <message>`

```bash
devlog start "Working on user auth for dashboard"
devlog start "Debugging API timeout issues"
```

#### `devlog stop <message>`

```bash
devlog stop "Auth flow working, need edge case handling"
devlog stop "Found timeout issue in connection pooling"
```

#### `devlog status`

- Shows current active session (if any)
- Duration of current session
- Warning for sessions open >4 hours (orphaned sessions)

#### `devlog today`

- Shows all sessions from today
- Useful for daily reflection and commit message generation

### Data Structure

#### Storage Location

- Global logs: `~/.devlog/`
- Per-project context tracking
- Project path detection from current working directory

#### Log Format

JSON Lines format for easy parsing:

```json
{"timestamp": "2025-06-06T10:30:00Z", "type": "start", "message": "Working on user auth", "project": "/path/to/project"}
{"timestamp": "2025-06-06T11:15:00Z", "type": "stop", "message": "Got login working", "project": "/path/to/project"}
```

### MVP Feature Set

1. **start** command - log intention with timestamp
2. **stop** command - log outcome/state with timestamp
3. **status** command - show current session info
4. Basic orphaned session detection

### Future Enhancements (Not MVP)

- Timer display (may be unnecessary since duration calculable from timestamps)
- `devlog today/week/month` views
- Git integration (suggest commit messages from sessions)
- Project-specific filtering
- Export capabilities for blog content generation

## Key Benefits

- **Natural Commit Points**: Stop messages like "feature X complete" trigger
  commits
- **Re-entry Context**: Provides context when returning to interrupted work
- **Content Pipeline**: Accumulated logs become source material for reflection
  and blog posts
- **Minimal Friction**: Quick voice-to-text input via system dictation

## Implementation Notes

- No external dependencies beyond Deno standard library
- Simple file I/O operations
- Timestamp handling for session duration calculation
- Cross-platform compatibility (Windows, macOS, Linux)

## Success Metrics

- Increased frequency of git commits
- Better session boundary awareness
- Accumulated material for weekly reflection and content creation
- Enhanced productivity through improved work visibility
