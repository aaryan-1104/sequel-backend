# Agent Rules for Sequel Backend

- **Terminal Commands**: The default terminal environment is PowerShell. To avoid Execution Policy restrictions and operator issues (like `&&`), ALWAYS wrap `npm` and node script commands in `cmd.exe /c "..."`.
- **Version Control**: You may run `git commit` locally to checkpoint your work, but NEVER execute `git push` to GitHub without explicitly asking the user for permission first and waiting for their approval.
- **Git Ignore**: Explicitly exclude Agent/AI related configuration files (like `GEMINI.md`, `.agents/`, etc.) from being pushed to version control. Ensure they are added to `.gitignore`.
