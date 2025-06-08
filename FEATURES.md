# DevLog CLI Features

## Core Commands

### `devlog start <message>`
- Log development intention with timestamp
- Detect current project from working directory
- Store in JSON Lines format
- Examples:
  ```bash
  devlog start "Working on user auth for dashboard"
  devlog start "Debugging API timeout issues"
  ```

### `devlog stop <message>`
- Log development outcome/current state with timestamp
- End current session for the project
- Examples:
  ```bash
  devlog stop "Auth flow working, need edge case handling"
  devlog stop "Found timeout issue in connection pooling"
  ```

### `devlog status`
- Show current active session (if any)
- Display session duration
- Warn if session > 4 hours (orphaned session detection)
- Show project context

## Data Storage

### Location
- Global logs stored in `~/.devlog/sessions.jsonl`
- Global settings in `~/.devlog/settings.json`
- Project-specific settings in `.devlog/settings.json` (in project root)
- Per-project context tracking via current working directory

### Log Format
JSON Lines with structure:
```json
{"timestamp": "2025-06-06T10:30:00Z", "type": "start", "message": "Working on user auth", "project": "/path/to/project"}
{"timestamp": "2025-06-06T11:15:00Z", "type": "stop", "message": "Got login working", "project": "/path/to/project"}
```

### Settings Format
Global settings (`~/.devlog/settings.json`):
```json
{
  "orphanedSessionThreshold": 240,
  "defaultProjectName": null,
  "timestampFormat": "iso",
  "colorOutput": true
}
```

Project-specific settings (`.devlog/settings.json`):
```json
{
  "projectName": "My Project",
  "orphanedSessionThreshold": 180,
  "autoCommitSuggestions": true,
  "excludePatterns": ["node_modules", ".git"]
}
```

## Session Management

### Active Session Detection
- Track start/stop pairs per project
- Handle multiple projects simultaneously
- Detect orphaned sessions (start without stop)

### Duration Calculation
- Calculate from timestamp differences
- Display in human-readable format (hours, minutes)
- Warning threshold configurable via settings (default 4+ hours)

## Project Context

### Project Detection
- Use current working directory as project identifier
- Full absolute path for uniqueness
- Allow multiple simultaneous projects
- Override project name via project-specific settings

### Settings Hierarchy
- Project settings override global settings
- Settings loaded on command execution
- Graceful fallback to defaults if settings missing

## Error Handling

### Input Validation
- Require message parameter for start/stop commands
- Provide helpful usage information
- Graceful handling of missing log files

### File System
- Create ~/.devlog directory if needed
- Create .devlog directory in project root if needed
- Handle permissions errors
- Robust JSON parsing with error recovery for both logs and settings

## Future Enhancements (Not MVP)

### Additional Commands
- `devlog today` - Show all sessions from today
- `devlog week/month` - Extended time views
- `devlog export` - Export for blog content
- `devlog config` - Manage global and project settings
- `devlog init` - Initialize project-specific settings

### Git Integration
- Suggest commit messages from stop entries
- Detect natural commit points

### Enhanced Display
- Colorized output
- Better formatting for long sessions
- Project filtering options

## Technical Requirements

### Runtime
- Deno 2.0 with TypeScript
- No external dependencies (std library only)
- Cross-platform compatibility

### Distribution
- Single binary executable
- Available in PATH
- Minimal installation footprint

### Voice Input Support
- Compatible with system dictation
- Quick message entry workflow