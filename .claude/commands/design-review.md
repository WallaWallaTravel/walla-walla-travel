# /design-review — Post-Implementation Design Audit

**Run this AFTER completing any UI work.** Produces a graded report (A-F) and auto-fixes critical issues.

**Usage:** `/design-review [path-to-page-or-component]`

If no path is given, ask the user which page or component to review.

---

## Step 1: Locate Design Brief

Check `claudedocs/design-briefs/` for a matching design brief.

- **If found:** Load it — this is the specification to audit against.
- **If not found:** Note "No design brief found — auditing against DESIGN_SYSTEM.md defaults only." Read `~/claude-docs/DESIGN_SYSTEM.md` for baseline values.

---

## Step 2: Read Implementation Code

Read all files that make up the page/component being reviewed. Include:
- The page file (e.g., `page.tsx`)
- All imported components
- Any relevant CSS/Tailwind config
- Layout files that wrap this page

Build a mental model of every visual element on the page.

---

## Step 3: Color Contrast Audit

### Forbidden Patterns (Auto-Fix)
These are ALWAYS wrong on white/light backgrounds. Fix them immediately without asking:

| Forbidden | Replace With | Reason |
|-----------|-------------|--------|
| `text-gray-300` | `text-gray-600` | Fails WCAG AA (1.9:1) |
| `text-gray-400` | `text-gray-600` | Fails WCAG AA (2.7:1) |
| `text-gray-350` | `text-gray-600` | Fails WCAG AA |
| `placeholder-gray-300` | `placeholder-gray-600` | Fails WCAG AA |
| `placeholder-gray-400` | `placeholder-gray-600` | Fails WCAG AA |
| `text-white` on `bg-white` | Context-dependent | Invisible text |
| `text-[color]-300` | `text-[color]-700` | Light tints fail contrast |
| `text-[color]-400` | `text-[color]-700` | Light tints fail contrast |

### Verify These Combinations
For each text/background pair found in the code:

| Text Class | Background Class | Minimum Ratio | Pass? |
|-----------|-----------------|---------------|-------|
| [class] | [class] | 4.5:1 (normal) or 3:1 (large) | [yes/no] |

**Grade this section:**
- **A**: All combinations pass WCAG AA
- **B**: All pass after auto-fixes applied
- **C**: 1-2 marginal cases (ratio 4.0-4.5)
- **D**: Multiple failures
- **F**: Widespread failures or forbidden patterns

---

## Step 4: Typography Hierarchy Check

Verify the page has a clear visual hierarchy:

| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| Only 1 `text-2xl`+ element (page title) | Yes | [?] | [?] |
| Section headings are `text-xl` | Yes | [?] | [?] |
| Body text is `text-base` or `text-sm` | Yes | [?] | [?] |
| Max 2 font weights used | Yes | [?] | [?] |
| Line height on body text (`leading-relaxed`) | Yes | [?] | [?] |
| Content width capped (`max-w-*` or `prose`) | Yes | [?] | [?] |

**Grade:**
- **A**: Clear hierarchy, 2 weights, proper line height
- **B**: Minor deviations (3 weights, or missing leading-relaxed)
- **C**: Hierarchy unclear in some sections
- **D**: Multiple size/weight inconsistencies
- **F**: No discernible hierarchy

---

## Step 5: Spacing Consistency Check

| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| Consistent gap between cards | Same `gap-*` throughout | [?] | [?] |
| Section spacing uses 1-2 values | `space-y-8` or `py-12` consistently | [?] | [?] |
| Card padding is consistent | Same `p-*` on all cards | [?] | [?] |
| Page padding is consistent | `px-6 sm:px-8` or similar | [?] | [?] |
| No mixing of `gap-3` and `gap-4` without reason | Consistent scale | [?] | [?] |
| Generous whitespace between major sections | `py-12`+ between sections | [?] | [?] |

**Grade:**
- **A**: Consistent spacing throughout, generous whitespace
- **B**: 1-2 minor inconsistencies
- **C**: Noticeable spacing irregularities
- **D**: Inconsistent spacing throughout
- **F**: Cramped or chaotic spacing

---

## Step 6: Component Consistency Check

| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| All buttons use same border-radius | `rounded-lg` everywhere | [?] | [?] |
| All cards use same border-radius | `rounded-xl` everywhere | [?] | [?] |
| Button sizes are consistent | Same `px-*` `py-*` pattern | [?] | [?] |
| Link styles are consistent | Same color and hover behavior | [?] | [?] |
| Icon sizes are consistent | Same `h-*` `w-*` pattern | [?] | [?] |
| Focus states present on interactive elements | `focus-visible:ring-*` | [?] | [?] |

**Grade:**
- **A**: All components follow consistent patterns
- **B**: 1-2 minor inconsistencies
- **C**: Some components diverge from patterns
- **D**: Multiple component style conflicts
- **F**: No consistent component patterns

---

## Step 7: Anti-Pattern Scan

Search the code for these violations. Each found is a deduction:

| Anti-Pattern | Search For | Severity |
|-------------|-----------|----------|
| Gradient backgrounds | `bg-gradient`, `from-`, `via-`, `to-` (on non-decorative elements) | Medium |
| Heavy shadows | `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` on cards | Medium |
| Too many colors | Count distinct color families used | High if >6 |
| Inline styles | `style={{` or `style=` | Medium |
| Bright saturated backgrounds | `bg-[color]-200`+ behind text | High |
| Decorative borders | Multiple `border-*` classes creating visual noise | Low |
| Fixed heights on text | `h-[n]` on elements containing text | Medium |
| More than 2 font weights | Count `font-normal`, `font-medium`, `font-semibold`, `font-bold` | Low |
| Missing hover states | Buttons/links without `hover:` | Medium |
| Missing focus states | Interactive elements without `focus-visible:` | High (a11y) |

**Grade:**
- **A**: No anti-patterns found
- **B**: 1-2 low-severity items
- **C**: 1 high or 3+ low items
- **D**: Multiple medium/high items
- **F**: Widespread anti-patterns

---

## Step 8: Design Brief Compliance (if brief exists)

Compare every value in the design brief against the implementation:

| Brief Spec | Expected | Actual | Match? |
|-----------|----------|--------|--------|
| Primary color | [from brief] | [from code] | [?] |
| Heading color | [from brief] | [from code] | [?] |
| Body text color | [from brief] | [from code] | [?] |
| Background | [from brief] | [from code] | [?] |
| Card style | [from brief] | [from code] | [?] |
| Button style | [from brief] | [from code] | [?] |
| Section spacing | [from brief] | [from code] | [?] |
| Max width | [from brief] | [from code] | [?] |

**Grade:**
- **A**: All specs match exactly
- **B**: 1-2 minor deviations (similar shade, slightly different spacing)
- **C**: Several deviations from brief
- **D**: Implementation loosely follows brief
- **F**: Brief was largely ignored

If no brief exists, grade as **N/A** and note this.

---

## Step 9: Responsive Spot Check

Check for mobile-friendliness:

| Check | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| Grid collapses on mobile | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | [?] | [?] |
| Text doesn't overflow | No horizontal scroll on 375px | [?] | [?] |
| Padding adjusts | `px-4 sm:px-6 lg:px-8` or similar | [?] | [?] |
| Images are responsive | `w-full` or proper max-width | [?] | [?] |
| Touch targets adequate | Buttons/links min 44px tap target | [?] | [?] |
| Mobile navigation present | Menu works on small screens | [?] | [?] |

**Grade:**
- **A**: Fully responsive with proper breakpoints
- **B**: Works on mobile with minor issues
- **C**: Some elements break on mobile
- **D**: Not mobile-friendly
- **F**: Broken on mobile

---

## Step 10: Generate Report

### Report Format

```
# Design Review: [Page/Component Name]
**Date:** [today]
**Design brief:** [path or "None"]
**Files reviewed:** [list of files]

## Overall Grade: [A-F]

## Section Grades
| Section | Grade | Auto-Fixed? |
|---------|-------|-------------|
| Color Contrast | [grade] | [yes/no] |
| Typography | [grade] | [N/A] |
| Spacing | [grade] | [N/A] |
| Components | [grade] | [N/A] |
| Anti-Patterns | [grade] | [N/A] |
| Brief Compliance | [grade or N/A] | [N/A] |
| Responsive | [grade] | [N/A] |

## Auto-Fixes Applied
[List every change made automatically, with file:line]

## Issues to Fix (ordered by priority)

### Critical (Fix Now)
1. [Issue] — [file:line] — [what to change]

### Important (Fix Before Shipping)
1. [Issue] — [file:line] — [what to change]

### Minor (Nice to Have)
1. [Issue] — [file:line] — [what to change]

## What's Working Well
- [Positive observation]
- [Positive observation]
```

### Grading Scale

| Grade | Meaning |
|-------|---------|
| **A** | Ship-ready. Clean, consistent, accessible. |
| **B** | Good. Minor polish needed — no blockers. |
| **C** | Acceptable. Several issues need attention before shipping. |
| **D** | Below standard. Significant design issues. Rework sections. |
| **F** | Fail. Major accessibility or consistency problems. Full review needed. |

**Overall grade** = Weighted average:
- Color Contrast: 25% (accessibility is non-negotiable)
- Typography: 15%
- Spacing: 15%
- Components: 15%
- Anti-Patterns: 10%
- Brief Compliance: 10% (0% if no brief)
- Responsive: 10%

### After Report

1. Apply all auto-fixes (contrast violations)
2. Present the report to the user
3. Ask: **"Want me to fix the [Critical/Important] issues now?"**
4. If yes, fix them and re-run the relevant sections to verify
