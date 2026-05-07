# locus

**Local AI coding terminal** — an offline, LLM-powered coding assistant that runs entirely on your machine.

Locus connects to a local LLM backend (llama.cpp via its OpenAI-compatible API) and gives you an interactive terminal where you can chat, run commands, and manipulate files — all without internet access.

---

## Architecture

```
locus/
├── bin/locus.ts              # npm/bin entry point — startup only, no logic
├── src/
│   ├── cli/                  # Terminal UI (readline-based interactive CLI)
│   ├── core/                 # Brain/orchestration layer
│   │   ├── session.ts        # Session lifecycle & creation
│   │   ├── prompt-builder.ts # System prompt assembly
│   │   ├── context-engine.ts # Context window pruning & token management
│   │   ├── task-runner.ts    # Tool execution dispatch
│   │   ├── orchestrator.ts   # Agent loop — tool calling, message routing
│   │   └── pipeline.ts       # Request/response pipeline with middleware hooks
│   ├── ai/                   # AI inference — isolated from UI & tools
│   │   ├── inference.ts      # LLM client abstraction
│   │   ├── tokenizer.ts      # Token estimation & truncation
│   │   ├── streaming.ts      # Stream buffering & flushing
│   │   ├── templates.ts      # System prompt templates
│   │   └── models.ts         # Model config & defaults
│   ├── providers/            # Provider abstraction — swap backends without rewrites
│   │   ├── types.ts          # LLMProvider interface, Message, ToolCall, etc.
│   │   ├── provider.ts       # Abstract base provider
│   │   └── llamacpp/         # llama.cpp implementation
│   │       ├── server.ts     # Server lifecycle management (stub)
│   │       ├── client.ts     # OpenAI-compatible streaming client
│   │       └── health.ts     # Server health check
│   ├── tools/                # Every terminal capability — isolated & extensible
│   │   ├── types.ts          # Tool type definitions
│   │   ├── registry.ts       # Central tool registration & lookup
│   │   ├── bash/             # Shell command execution
│   │   ├── files/            # File read/write with mkdir -p
│   │   ├── edit/             # Exact-string file editing
│   │   ├── grep/             # Content search via ripgrep
│   │   ├── search/           # Glob pattern file search
│   │   └── git/              # Git operations
│   ├── memory/               # Conversation & cache management
│   │   ├── session-memory.ts # Message store
│   │   ├── summary.ts        # Persisted session summaries
│   │   ├── compaction.ts     # History compaction (FIFO pruning)
│   │   └── cache.ts          # Generic TTL cache
│   ├── repo/                 # Repository intelligence layer
│   │   ├── scanner.ts        # File system scanner
│   │   ├── indexer.ts        # Content indexer
│   │   ├── symbols.ts        # Symbol extraction & lookup
│   │   ├── chunker.ts        # File chunking for large contexts
│   │   ├── retrieval.ts      # Retrieval search
│   │   ├── embeddings.ts     # Embedding generation (stub)
│   │   └── summaries.ts      # Per-file summaries
│   ├── runtime/              # Application lifecycle
│   │   ├── bootstrap.ts      # Startup — connect to LLM, launch CLI
│   │   ├── lifecycle.ts      # Init/shutdown hooks
│   │   ├── state.ts          # Global runtime state
│   │   └── shutdown.ts       # Graceful shutdown with cleanup
│   ├── auth/                 # Licensing system
│   │   ├── license.ts        # License manager
│   │   ├── activation.ts     # Activation flow
│   │   ├── verification.ts   # License verification
│   │   ├── device.ts         # Device fingerprinting
│   │   └── storage.ts        # License persistence
│   ├── config/               # Configuration
│   │   ├── config.ts         # Re-exports AppConfig type
│   │   ├── defaults.ts       # Default config values
│   │   ├── schema.ts         # Config validation
│   │   └── loader.ts         # File + env var loader
│   ├── ui/                   # Terminal UI layer (separate from AI engine)
│   │   ├── app.tsx           # UI entry point
│   │   ├── components/       # Reusable UI components
│   │   ├── screens/          # Full-screen views
│   │   ├── dialogs/          # Modal dialogs
│   │   └── theme/            # Colors & styling
│   ├── modes/                # Offline/online mode switching
│   │   ├── mode.ts           # Mode state management
│   │   ├── offline.ts        # Offline mode init
│   │   ├── online.ts         # Online mode init
│   │   └── resolver.ts       # Provider resolution per mode
│   └── utils/                # Shared utilities
├── scripts/                  # Setup & packaging
│   ├── install-models.ts     # GGUF model downloader (stub)
│   ├── setup-llama.ts        # llama.cpp binary downloader (stub)
│   ├── package-binary.ts     # Standalone binary packager (stub)
│   └── cleanup.ts            # Cache/temp cleanup (stub)
├── storage/                  # Local runtime data (gitignored content)
│   ├── sessions/             # Conversation history
│   ├── indexes/              # Repo indexes
│   ├── cache/                # General cache
│   ├── memory/               # Summaries & memory
│   └── licenses/             # License keys
├── models/                   # Local GGUF files (gitignored)
└── assets/                   # Static assets
```

---

## Requirements

- **Node.js** 18+ (ESM)
- **llama.cpp** running as a server (`llama-server`) with an OpenAI-compatible endpoint
  - Or any OpenAI-compatible API (works with Ollama, vLLM, etc.)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Start llama.cpp server (in another terminal)
llama-server -m path/to/model.gguf --host 127.0.0.1 --port 8080

# 4. Run locus
npm start
```

Or use the dev mode with hot-reload:

```bash
npm run dev
```

---

## Configuration

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `LOCUS_BASE_URL` | `http://127.0.0.1:8080/v1` | LLM API endpoint |
| `LOCUS_MODEL` | `qwen2.5-coder-7b-instruct` | Model name |
| `LOCUS_TEMPERATURE` | `0.1` | Sampling temperature |
| `LOCUS_MAX_TOKENS` | `8192` | Max tokens per response |

### Config file

Create `locus.config.json` in the project root or `~/.locus/config.json`:

```json
{
  "baseURL": "http://127.0.0.1:8080/v1",
  "model": "qwen2.5-coder-7b-instruct",
  "temperature": 0.1,
  "maxTokens": 8192
}
```

---

## CLI Commands

| Command | Description |
|---|---|
| `/help` | Show available commands |
| `/clear` | Clear the terminal screen |
| `/reset` | Reset the conversation session |
| `/exit` or `/quit` | Exit locus |

Everything else typed at the prompt is sent to the LLM as a request.

---

## Tools

The AI agent has access to these tools:

| Tool | Description |
|---|---|
| `bash` | Execute shell commands in the workspace |
| `read` | Read file contents with line numbers |
| `write` | Write content to a file (creates directories) |
| `edit` | Apply exact string replacements to files |
| `glob` | Search for files matching glob patterns |
| `grep` | Search file contents with regex (uses ripgrep) |
| `git` | Run git operations (status, diff, log, etc.) |

---

## Design Principles

1. **Offline-first** — Everything runs locally, no cloud dependency
2. **Provider abstraction** — Swap LLM backends by implementing `LLMProvider`
3. **Separation of concerns** — AI inference, UI, tools, and config are independent layers
4. **Extensible tools** — Add new capabilities by creating a tool folder and registering it
5. **Graceful degradation** — If the LLM is unreachable, locus explains what to do rather than crashing

---

## Adding a New Provider

Implement the `LLMProvider` interface from `src/providers/types.ts`:

```typescript
import { BaseProvider } from './provider.js'

export class MyProvider extends BaseProvider {
  async chat(messages, tools?) { /* ... */ }
  async chatStream(messages, tools?, onToken?) { /* ... */ }
}
```

Then swap it in `src/runtime/bootstrap.ts`.

---

## Adding a New Tool

1. Create `src/tools/<name>/index.ts` with a `Tool` export
2. Add it to `src/tools/registry.ts`

```typescript
export const myTool: Tool = {
  definition: { /* OpenAI tool schema */ },
  handler: async (args) => { /* return string result */ },
}
```

---

## Packaging as npm Dependency

```bash
npm pack   # creates locus-0.1.0.tgz
```

The npm package ships only the terminal runtime and logic — GGUF models and llama.cpp binaries are downloaded on first launch via `locus setup`.

---

## License

MIT
