# Walla Walla Ecosystem - Command Reference

Complete reference for all Claude Code slash commands.

## 🎯 Quick Start

```
/status          # Where are we overall?
/module-status   # Status of all modules
/standup         # Plan today's work
```

## 📋 All Commands

### Status & Planning
| Command | Purpose |
|---------|---------|
| `/status` | Commercial readiness progress (Walla Walla Travel) |
| `/module-status` | All modules in ecosystem |
| `/standup` | Daily planning and focus |
| `/help` | This reference |

### Auditor's Dream
| Command | Purpose |
|---------|---------|
| `/supabase-setup` | Complete Supabase configuration |
| `/connect-data` | Replace mocks with real Supabase queries |

### Quality & Security (Walla Walla Travel)
| Command | Purpose |
|---------|---------|
| `/security-check` | Security audit against checklist |
| `/test-status` | Test coverage analysis |
| `/quality-check` | Code quality analysis |

### Phase Execution (Walla Walla Travel)
| Command | Purpose |
|---------|---------|
| `/phase1` | Critical fixes (Week 1) |
| `/phase2` | High priority (Week 2-3) |
| `/phase3` | Comprehensive coverage (Week 4-6) |
| `/phase4` | Production polish (Week 7-8) |

### Utilities
| Command | Purpose |
|---------|---------|
| `/fix-console` | Replace console.* with logger |
| `/write-tests` | Generate tests for untested code |

---

## 🏗️ Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                         │
│         (Shared database for all modules)                   │
└─────────────────────────────────────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
     ▼                      ▼                      ▼
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Walla     │    │   Auditor's     │    │   Driver    │
│   Walla     │    │   Dream         │    │   Portal    │
│   Travel    │    │   (Operator +   │    │   (Planned) │
│  (Next.js)  │    │   Regulator)    │    │             │
└─────────────┘    └─────────────────┘    └─────────────┘
```

---

## 🚀 Common Workflows

### Starting Fresh Session
```
1. /module-status    # See all modules
2. /status           # Check progress
3. /standup          # Plan the day
```

### Working on Auditor's Dream
```
1. /supabase-setup   # Ensure database ready
2. /connect-data     # Replace mocks with real data
3. cd auditors-dream/apps/operator && npm run dev
```

### Working on Walla Walla Travel
```
1. /status           # Check commercial readiness
2. /phase1           # Start with critical fixes (or current phase)
3. cd /Users/temp/walla-walla-final && npm run dev
```

### Before Committing
```
1. /quality-check    # Code quality
2. /security-check   # Security audit
3. npm test          # Run tests
```

### Before Deployment
```
1. /test-status      # Verify coverage
2. /security-check   # Final security review
3. npm run build     # Verify build works
```

---

## 📁 Key Directories

| Path | Purpose |
|------|---------|
| `/Users/temp/walla-walla-final/` | Main project (Next.js) |
| `.cursor/worktrees/walla-walla-final/` | Cursor worktrees |
| `auditors-dream/apps/operator/` | Operator Portal |
| `auditors-dream/apps/regulator/` | Regulator Portal |
| `auditors-dream/packages/database/` | Shared migrations |

---

## 📚 Key Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE_CODE_HANDOFF.md` | Immediate tasks & context |
| `PROJECT_SYNOPSIS.md` | Full project overview |
| `ARCHITECTURE.md` | Architecture decisions |
| `COMMERCIAL_READINESS_ROADMAP.md` | Improvement plan |
| `.claude/CLAUDE.md` | Master context for Claude |

---

## 🔧 Development Commands

### Auditor's Dream
```bash
# Operator Portal
cd auditors-dream/apps/operator
npm run dev  # http://localhost:5173

# Regulator Portal
cd auditors-dream/apps/regulator
npm run dev  # http://localhost:5174
```

### Walla Walla Travel
```bash
cd /Users/temp/walla-walla-final
npm run dev  # http://localhost:3000
```

### Testing
```bash
npm test                    # Run tests
npm test -- --coverage      # With coverage
npx tsc --noEmit           # Type check
npm run lint               # Lint check
```

---

## 💡 Tips

1. **Start with `/module-status`** - Understand the full ecosystem
2. **Check handoff first** - `CLAUDE_CODE_HANDOFF.md` has immediate tasks
3. **One module at a time** - Don't context-switch between products
4. **Commit frequently** - Small, focused commits
5. **Test before deploy** - Always run tests and build

---

## 🆘 Troubleshooting

### "Command not found"
- Ensure you're in the project directory
- Check `.claude/commands/` for available commands

### "Supabase connection failed"
- Run `/supabase-setup` to verify configuration
- Check `.env` files have correct credentials

### "Build fails"
- Run `/quality-check` to identify issues
- Check TypeScript errors: `npx tsc --noEmit`

### "Tests failing"
- Run `/test-status` for analysis
- Check specific test: `npm test -- path/to/test`
