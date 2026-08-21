# Connect Your Claude Max Subscription to OpenClaw

Run these two commands in a **separate terminal** (not in Claude Code CLI):

## Step 1: Generate a setup token
```bash
claude setup-token
```
This will display a token. Copy it.

## Step 2: Paste it into OpenClaw
```bash
openclaw models auth paste-token --provider anthropic
```
Paste the token when prompted.

## Step 3: Verify it works
```bash
openclaw agents list
```
You should see all 10 agents listed.

## Switching Between Providers

### Use Ollama (free, local):
```bash
openclaw config set agents.defaults.model.primary "ollama/qwen3-coder:7b"
openclaw gateway restart
```

### Use Claude Max (subscription):
```bash
openclaw config set agents.defaults.model.primary "anthropic/claude-sonnet-4-5-20250514"
openclaw gateway restart
```

### Use Claude Opus (for complex tasks):
```bash
openclaw config set agents.defaults.model.primary "anthropic/claude-opus-4-6-20250610"
openclaw gateway restart
```
