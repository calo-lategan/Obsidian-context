# SS-WORKSHOP-Stock-App — Project Dos and Don'ts

## DOs
- **Report only at completion** — No narration during execution. Summary only when done.
- **Parallel tool calls** — Run independent reads, writes, searches simultaneously.
- **Prepare files locally while waiting** — Use `/sessions/optimistic-modest-cannon/fix-files/` as staging area during installs/builds.
- **Base64 + `node -e` for file transfer** — Most reliable method for writing files to Codespace via xterm paste.
- **Press Enter after xterm paste** — Paste events don't always auto-execute; always follow with a Return keypress.
- **Ctrl+C → Ctrl+U to clear terminal** — When commands get concatenated or stuck.
- **Single command per paste** — Never paste multiple commands separated by newlines; they concatenate unpredictably.
- **`npm install` for deps** — Faster and more reliable than editing package.json manually.
- **Verify with echo markers** — Always append `&& echo "STEP_OK"` to confirm command success.
- **Use `onstart-onthinking` protocol** — Every response, no exceptions.
- **Token economy** — Zero filler, zero preamble, zero narration mid-task.

## DON'Ts
- **Don't narrate mid-task** — User explicitly requested: only report at completion.
- **Don't use tar.gz for file transfer** — CRC errors from base64 chunking caused file corruption (excelExport.ts went binary).
- **Don't use `\x15` (Ctrl+U) in paste strings** — Terminal interprets it as `~U` literal, not line-clear.
- **Don't paste multiple commands as one block** — They merge into a single garbled command.
- **Don't use `-uall` flag with git status** — Can cause memory issues on large repos.
- **Don't explain what you're about to do** — Just do it. Report results.
- **Don't send chunks > 4KB via xterm paste** — Larger pastes may get truncated or corrupted.
- **Don't assume heredocs work in xterm paste** — Multiline content is unreliable; use base64 + node -e instead.
- **Don't skip `npm install` verification** — Always check for `DEPS_OK` or equivalent marker.

## Codespace Details
- **Repo**: `calo-lategan/SS-WORKSHOP-Stock-app` on `main`
- **Codespace**: `vigilant-zebra`
- **Tab ID**: 122479623
- **xterm paste target**: `.xterm-helper-textarea`
- **Working dir**: `/workspaces/SS-WORKSHOP-Stock-app`

## Tech Stack
- React 19 + Vite 6 + TypeScript + Tailwind CSS 4 + Dexie.js 4 + Zustand 5
- react-i18next 15 (EN + HI) + SheetJS (xlsx) + vite-plugin-pwa + Lucide React
- Supabase (PostgreSQL + Storage + Edge Functions) + Vercel deployment

## File Transfer Pattern (Reliable)
```bash
node -e "require('fs').writeFileSync('PATH', Buffer.from('BASE64_CONTENT','base64').toString())" && echo 'WRITE_OK'
```
