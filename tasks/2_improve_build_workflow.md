# Improve GitHub Actions Build Workflow

## Overview

Enhance the existing GitHub Actions workflow to include comprehensive testing before building binaries and address platform-specific environment variable issues.

## Tasks

### 1. Add Pre-Build Testing

Add a test step before the build step in each matrix job to ensure functionality works correctly on each platform before creating binaries.

**Implementation:**
- Add test step after Deno setup but before binary compilation
- Run `deno task test` to execute the comprehensive test suite
- Ensure tests pass before proceeding to build step
- This will catch platform-specific issues early

### 2. Fix Windows Environment Variable Issues

Windows uses different environment variables than Unix-like systems for user directories.

**Problem:**
- Current workflow uses `$HOME` which may not exist on Windows
- Windows typically uses `%USERPROFILE%` or `%HOMEPATH%`
- This could cause build failures or runtime issues on Windows

**Investigation needed:**
- Test if Deno on Windows properly handles `$HOME` environment variable
- Verify if our current permissions `--allow-env=HOME` work on Windows
- Check if Windows builds can access user directories correctly

**Potential fixes:**
- Update permissions to include Windows-specific env vars: `--allow-env=HOME,USERPROFILE,HOMEPATH`
- Modify the application code to handle cross-platform home directory detection
- Use Deno's built-in APIs for cross-platform path resolution

### 3. Platform-Specific Testing Strategy

**Per-platform verification:**
- **macOS**: Test both x64 and ARM64 builds
- **Linux**: Test both x64 and ARM64 builds  
- **Windows**: Test x64 build with proper environment variable handling

**Test scenarios to cover:**
- Home directory access and `.devlog` directory creation
- File read/write operations in user directories
- Environment variable resolution across platforms
- Command execution and output formatting

### 4. Enhanced Error Handling

**Add better error reporting:**
- Capture test output and display on failure
- Add platform-specific debugging information
- Include environment variable dumps for troubleshooting

## Implementation Steps

1. **Update workflow file** to add test step before build
2. **Research Windows environment variables** used by Deno
3. **Update Deno compile permissions** to include Windows env vars
4. **Test locally** using `gh act` with Windows containers (if possible)
5. **Update application code** if needed for cross-platform compatibility
6. **Verify** all platforms build and test successfully

## Acceptance Criteria

- [ ] All platform builds run tests before compilation
- [ ] Tests pass on all supported platforms (macOS, Linux, Windows)
- [ ] Windows builds properly handle user directory access
- [ ] Binary artifacts work correctly on their target platforms
- [ ] Failed tests prevent binary creation
- [ ] Clear error messages for any platform-specific issues

## Notes

This task builds upon the existing workflow in `.github/workflows/build-release.yml` and ensures we catch cross-platform compatibility issues before releasing binaries to users.