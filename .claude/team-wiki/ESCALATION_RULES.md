# Escalation Rules

## Core Principle

**Handle autonomously → Inform after → Consult before → Escalate immediately**

---

## Decision Tree

```
Is this a...?
│
├─► TECHNICAL IMPLEMENTATION
│   └─► Handle autonomously, report completion
│       Examples: Code refactoring, bug fixes, test writing
│
├─► MULTIPLE VALID APPROACHES
│   └─► Present options with trade-offs to user
│       Examples: Library choice, architecture pattern, optimization strategy
│
├─► STRATEGIC/ARCHITECTURAL CHANGE
│   └─► Always consult user FIRST
│       Examples: New service provider, major refactor, feature direction
│
├─► BUSINESS RULE INTERPRETATION
│   └─► Always consult user
│       Examples: Pricing logic, booking rules, compliance requirements
│
├─► COST IMPLICATION
│   └─► Always consult user
│       Examples: New service, increased usage, infrastructure change
│
└─► SECURITY CONCERN
    └─► Alert user IMMEDIATELY
        Examples: Vulnerability found, data exposure risk, auth issue
```

---

## By Category

### 🟢 HANDLE AUTONOMOUSLY

| Category | Examples |
|----------|----------|
| Code fixes | Bug fixes, type errors, lint issues |
| Code quality | Refactoring, cleanup, optimization |
| Testing | Writing tests, fixing test failures |
| Documentation | Updating comments, fixing docs |
| Routine deploy | Standard deployments, env updates |
| Style/formatting | Tailwind, code style, naming |

**Action**: Complete work, report when done

---

### 🟡 INFORM AFTER

| Category | Examples |
|----------|----------|
| Performance | Optimizations made, caching added |
| Security hardening | Dependencies updated, headers added |
| Monitoring | Alerts configured, logs improved |
| Minor refactors | Internal restructuring, DRY improvements |

**Action**: Complete work, explain what was done and why

---

### 🟠 PRESENT OPTIONS

| Category | Examples |
|----------|----------|
| Multiple approaches | 2+ valid solutions exist |
| Trade-offs involved | Speed vs. maintainability, cost vs. features |
| Reversible decisions | Can easily change later |
| Preference matters | UI/UX choices, naming conventions |

**Action**: Present options with:
- Clear description of each
- Trade-offs in plain language
- Recommendation (if one is clearly better)
- "Other" option for user's own idea

---

### 🔴 CONSULT FIRST

| Category | Examples |
|----------|----------|
| New services | Adding Stripe feature, new API integration |
| Architecture | Database schema changes, new patterns |
| Business logic | Pricing changes, booking rules, policies |
| User-facing | Major UI changes, new features |
| Costs | Anything with financial implications |
| Data | Changes to how data is stored/used |

**Action**: Explain situation, ask for direction BEFORE doing work

---

### 🚨 ESCALATE IMMEDIATELY

| Category | Examples |
|----------|----------|
| Security vulnerability | XSS, SQL injection, auth bypass |
| Data exposure | PII risk, credential leaks |
| Production issue | Downtime, critical errors |
| Compliance risk | FMCSA violation, legal concern |

**Action**: Alert immediately, stop work if necessary, await guidance

---

## By Agent

| Agent | Handle Autonomously | Consult User |
|-------|---------------------|--------------|
| Orchestrator | Task routing, coordination | Priority conflicts, scope changes |
| Tech Strategist | Simple optimizations | Major simplification proposals |
| Frontend Lead | Component tweaks, a11y fixes | UX direction, major visual changes |
| Backend Lead | API fixes, service improvements | New providers, schema changes |
| Quality Engineer | Test fixes, monitoring config | Security issues, critical gaps |
| DevOps Lead | Deploy optimization, env config | Cost changes, infra decisions |
| Domain Expert | Data validation, logic fixes | Business rule changes, pricing |
| Codebase Steward | File cleanup, doc updates | Major reorganization |

---

## Escalation Format

When escalating, always provide:

```
📍 CONTEXT
What we're working on and why this came up

❓ DECISION NEEDED
Clear, specific statement of what you need to decide

📊 OPTIONS
A) [First option]
   - Trade-off: [plain language]
   
B) [Second option]
   - Trade-off: [plain language]

C) Other
   - Your own approach

💡 RECOMMENDATION (if applicable)
What the team suggests and why

⚡ IMPACT
What happens with each choice
```

---

## Time Sensitivity

| Urgency | Response Expectation | Examples |
|---------|---------------------|----------|
| 🚨 Critical | Immediate | Security, production down |
| 🔴 High | Same session | Blocking work, user waiting |
| 🟡 Medium | Within day | Architecture decision, feature direction |
| 🟢 Low | When convenient | Optimization, cleanup decisions |

---

**Version**: 1.0
