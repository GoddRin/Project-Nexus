<!-- BEGIN:windows-run-command-fix -->
# Windows Command Execution Rule

When using the `run_command` tool on Windows:
1. NEVER run Node CLI commands (like `npm`, `npx`, `tsc`, `prisma`) without their explicit `.cmd` extension. For example, ALWAYS use `npm.cmd install` instead of `npm install`, and `npx.cmd prisma` instead of `npx prisma`.
2. For shell built-in commands (like `echo`, `dir`, `del`), ALWAYS prefix the command with `cmd.exe /c`. For example, `cmd.exe /c echo "test"`.
This prevents the `CORTEX_STEP_TYPE_RUN_COMMAND: Access is denied.` error caused by Windows process execution APIs failing to spawn batch files or built-ins directly.
<!-- END:windows-run-command-fix -->
