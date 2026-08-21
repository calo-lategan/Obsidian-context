# Site Services — Developer Setup Guide (Windows)

## Step 1: Install Everything (5 minutes)

Download and install these three things in order:

### 1A. Git
- Download: https://git-scm.com/download/win
- Run installer → **keep all defaults**
- When it asks for default editor: select **Visual Studio Code**
- When it asks about PATH: select **Git from the command line and also from 3rd-party software**
- Everything else: Next → Next → Install

### 1B. VS Code
- Download: https://code.visualstudio.com/download
- Run installer → check **all boxes** (Add to PATH, Open with Code, etc.)

### 1C. Node.js (needed for Claude Code)
- Download: https://nodejs.org (click the **LTS** version, green button)
- Run installer → keep all defaults → Install

### 1D. Restart your computer
After installing all three, restart once so PATH updates take effect.

---

## Step 2: Open VS Code and Configure Git (2 minutes)

1. Open VS Code
2. Press **Ctrl+`** (backtick) to open the terminal
3. Run these commands one at a time:

```
git config --global user.name "Calo"
git config --global user.email "calolategan@gmail.com"
```

---

## Step 3: Create GitHub Repository (3 minutes)

1. Go to https://github.com/new in your browser
2. Fill in:
   - Repository name: `site-services-app`
   - Description: `Al Laith Site Services Digital Transformation Platform`
   - Visibility: **Private**
   - Do NOT add README, .gitignore, or license (we have those ready)
3. Click **Create repository**
4. Copy the HTTPS URL (looks like: `https://github.com/YOUR_USERNAME/site-services-app.git`)

---

## Step 4: Clone and Initialize Project (2 minutes)

In VS Code terminal, navigate to your Cowork shared folder and run:

```
cd "C:\path\to\your\Folder Org"
git clone https://github.com/YOUR_USERNAME/site-services-app.git
cd site-services-app
```

The project scaffold is already in the `site-services-app/` folder (created by Claude in Cowork). After cloning, copy the scaffold files in.

Then:
```
git add .
git commit -m "Initial project scaffold with architecture and skill files"
git push -u origin main
```

VS Code will prompt you to sign into GitHub — follow the browser popup.

---

## Step 5: Install Claude Code (1 minute)

In VS Code terminal:

```
npm install -g @anthropic-ai/claude-code
```

Then install the VS Code extension:
1. Press **Ctrl+Shift+X** (Extensions panel)
2. Search for **"Claude Code"**
3. Click **Install**

---

## Step 6: Start Coding

Open the project folder in VS Code:
```
code .
```

Claude Code will automatically read:
- `.claude/CLAUDE.md` — full project context, DOs/DON'Ts, architecture rules
- `.claude/skills/site-services-webapp/SKILL.md` — implementation reference
- `.claudeignore` — knows what files to skip

You're ready. Ask Claude Code to start building Engine 1 (Fleet Dashboard).

---

## How Updates Flow

```
You code in VS Code ←→ Same folder Cowork sees
Claude Code helps you ←→ Reads CLAUDE.md for context
You commit + push     →  GitHub stores history
Cowork updates docs   →  You pull changes into VS Code
```
