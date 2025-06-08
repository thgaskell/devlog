# GitHub Actions Setup Guide for DevLog CLI

## Overview

This guide will help you create a GitHub Actions workflow that builds the DevLog
CLI tool for multiple platforms and creates a GitHub Release with the compiled
binaries.

## Step 1: Create the Workflow Directory Structure

1. In your project root, create the GitHub Actions workflow directory:
   ```bash
   mkdir -p .github/workflows
   ```

2. Create a new workflow file:
   ```bash
   touch .github/workflows/build-release.yml
   ```

## Step 2: Configure the Workflow File

Copy the following content into `.github/workflows/build-release.yml`:

```yaml
name: Build and Release DevLog CLI

# Trigger: Manual workflow dispatch only (for maintainers)
on:
  workflow_dispatch:
    inputs:
      release_name:
        description: "Release name (optional - will auto-generate if empty)"
        required: false
        default: ""

jobs:
  build:
    name: Build for ${{ matrix.target }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false # Don't cancel other builds if one fails
      matrix:
        include:
          # macOS builds
          - target: x86_64-apple-darwin
            os: macos-latest
            output_name: devlog-macos-x64
          - target: aarch64-apple-darwin
            os: macos-latest
            output_name: devlog-macos-arm64

          # Linux builds
          - target: x86_64-unknown-linux-gnu
            os: ubuntu-latest
            output_name: devlog-linux-x64
          - target: aarch64-unknown-linux-gnu
            os: ubuntu-latest
            output_name: devlog-linux-arm64

          # Windows builds
          - target: x86_64-pc-windows-msvc
            os: windows-latest
            output_name: devlog-windows-x64.exe
          - target: aarch64-pc-windows-msvc
            os: windows-latest
            output_name: devlog-windows-arm64.exe

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x # Use latest stable version

      - name: Cache Deno dependencies
        uses: actions/cache@v3
        with:
          path: ~/.cache/deno
          key: deno-${{ runner.os }}-${{ hashFiles('deno.lock') }}
          restore-keys: |
            deno-${{ runner.os }}-

      - name: Build binary
        run: |
          deno compile \
            --allow-env=HOME \
            --allow-write=$HOME/.devlog/,.devlog/ \
            --allow-read=$HOME/.devlog/,.devlog/ \
            --target ${{ matrix.target }} \
            --output ${{ matrix.output_name }} \
            main.ts

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.output_name }}
          path: ${{ matrix.output_name }}
          retention-days: 1

  release:
    name: Create Release
    needs: build
    runs-on: ubuntu-latest
    if: success() # Only run if all builds succeeded

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: ./binaries

      - name: Display downloaded files
        run: |
          ls -la ./binaries
          find ./binaries -type f -exec ls -la {} \;

      - name: Generate release info
        id: release_info
        run: |
          # Generate release name and tag
          TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
          SHORT_SHA=${GITHUB_SHA:0:7}

          if [ -n "${{ github.event.inputs.release_name }}" ]; then
            RELEASE_NAME="${{ github.event.inputs.release_name }}"
            TAG_NAME="release-${TIMESTAMP}-${SHORT_SHA}"
          else
            RELEASE_NAME="Development Build ${TIMESTAMP}"
            TAG_NAME="dev-${TIMESTAMP}-${SHORT_SHA}"
          fi

          echo "release_name=${RELEASE_NAME}" >> $GITHUB_OUTPUT
          echo "tag_name=${TAG_NAME}" >> $GITHUB_OUTPUT
          echo "timestamp=${TIMESTAMP}" >> $GITHUB_OUTPUT
          echo "short_sha=${SHORT_SHA}" >> $GITHUB_OUTPUT

      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.release_info.outputs.tag_name }}
          release_name: ${{ steps.release_info.outputs.release_name }}
          body: |
            ## Development Build

            **Build Information:**
            - Commit: `${{ steps.release_info.outputs.short_sha }}`
            - Built: ${{ steps.release_info.outputs.timestamp }}
            - Triggered by: @${{ github.actor }}

            **Available Platforms:**
            - macOS (Intel x64, Apple Silicon ARM64)
            - Linux (x64, ARM64)
            - Windows (x64, ARM64)

            **Note:** This is a development build and may contain experimental features or bugs.
          draft: false
          prerelease: true

      - name: Upload Release Assets
        run: |
          # Upload each binary to the release
          for binary_dir in ./binaries/*/; do
            binary_name=$(basename "$binary_dir")
            binary_path=$(find "$binary_dir" -type f -executable -o -name "*.exe" | head -1)

            if [ -f "$binary_path" ]; then
              echo "Uploading $binary_name from $binary_path"
              gh release upload ${{ steps.release_info.outputs.tag_name }} "$binary_path"
            else
              echo "Warning: No binary found in $binary_dir"
            fi
          done
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Step 3: Adjust the Workflow for Your Project

### Required Changes:

1. **Update the main file path:**
   - Change `main.ts` to your actual entry point file (e.g., `src/cli.ts`,
     `index.ts`)

2. **Deno permissions are already configured:**
   - Uses specific read/write permissions for DevLog directories only
   - Only allows HOME environment variable access

3. **Binary name is configured:**
   - All binaries are named `devlog` for the respective platforms

### Optional Customizations:

1. **Add additional targets** if needed:
   ```yaml
   # Add more platforms to the matrix
   - target: x86_64-unknown-linux-musl
     os: ubuntu-latest
     output_name: devlog-linux-musl-x64
   ```

2. **Modify Deno version:**
   ```yaml
   deno-version: v2.1.0 # Pin to specific version
   ```

## Step 4: Test the Workflow

1. **Commit and push your changes:**
   ```bash
   git add .github/workflows/build-release.yml
   git commit -m "Add GitHub Actions workflow for building CLI releases"
   git push origin main
   ```

2. **Manually trigger the workflow:**
   - Go to your GitHub repository
   - Click on "Actions" tab
   - Select "Build and Release DevLog CLI" workflow
   - Click "Run workflow" button
   - Optionally provide a custom release name
   - Click "Run workflow"

## Step 5: Verify the Results

After the workflow completes:

1. **Check the Actions tab** for any build failures
2. **Go to Releases** to see your new release
3. **Download and test** each binary on the respective platforms
4. **Verify permissions** by running the binaries

## Troubleshooting Tips

### Common Issues:

1. **Permission denied errors:**
   - Make sure you have the right `--allow-*` flags for your Deno app

2. **Build failures on specific platforms:**
   - Check the Actions logs for specific error messages
   - Some Deno features might not be available on all targets

3. **Missing binaries in release:**
   - Ensure your main TypeScript file path is correct
   - Check that the build step completed successfully

4. **Large binary sizes:**
   - Consider using `--no-check` flag if type checking isn't needed at compile
     time
   - Use `--lite` flag for smaller binaries (with reduced functionality)

### Debugging Commands:

Add these steps to debug issues:

```yaml
- name: Debug - List files
  run: |
    ls -la
    deno --version

- name: Debug - Check Deno cache
  run: deno info
```

## Security Notes

- The workflow uses `GITHUB_TOKEN` which is automatically provided
- No additional secrets configuration is needed
- The workflow only triggers manually (workflow_dispatch)
- Consider adding branch protection if this will be used in production

## Next Steps

Once this is working:

1. Consider adding automated testing before builds
2. Add code signing for production releases
3. Implement proper semantic versioning
4. Add changelog generation
5. Consider adding deployment automation
