<!-- BEGIN:windows-run-command-fix -->
# Windows Command Execution Rule

When using the `run_command` tool on Windows:
1. NEVER run Node CLI commands (like `npm`, `npx`, `tsc`, `prisma`) without their explicit `.cmd` extension. For example, ALWAYS use `npm.cmd install` instead of `npm install`, and `npx.cmd prisma` instead of `npx prisma`.
2. For shell built-in commands (like `echo`, `dir`, `del`), ALWAYS prefix the command with `cmd.exe /c`. For example, `cmd.exe /c echo "test"`.
This prevents the `CORTEX_STEP_TYPE_RUN_COMMAND: Access is denied.` error caused by Windows process execution APIs failing to spawn batch files or built-ins directly.
<!-- END:windows-run-command-fix -->

<!-- BEGIN:atlas-gis-reversibility-rule -->
# Project Atlas GIS Exploration & Non-Linear Navigation Rule

1. NEVER make the interface feel like it is forcing a user through a slideshow or linear track.
2. Every cinematic camera transition (flyTo, easeTo, footprint zoom, regional pitch) MUST remain fully reversible and interruptible.
3. The user must ALWAYS be able to:
   - Return immediately to the full Philippine national view via breadcrumb, button, or Escape key.
   - Search normally at any moment without modal locks or forced animations.
   - Open, filter, and browse the Project Directory freely.
   - Jump directly to any project from map markers, search results, or URL parameters.
4. User interactions (pan, zoom, click, keypress) must instantly interrupt running map camera transitions so that Atlas functions as a powerful, responsive, and authoritative GIS tool while preserving rich visual storytelling.
<!-- END:atlas-gis-reversibility-rule -->

