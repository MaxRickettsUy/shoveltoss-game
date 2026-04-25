# Per-Feature Plan + Review Workflow (Claude Code Setup)

This document defines a lightweight, human-in-the-loop development workflow using Claude Code with two-model roles:

* **Opus = Planner + Reviewer (validation layer)**
* **Sonnet = Implementer (execution layer)**
* **Git = source of truth**

The system is designed to avoid long-lived planning artifacts while still preserving structure and control.

---

# 🧠 Core Principles

1. **No global plan files**

   * No PLAN.md
   * No evolving architecture docs
   * No persistent review documents

2. **Per-feature planning only**

   * Each feature gets its own temporary `plan.md`
   * Plan is discarded or archived after completion

3. **Git is the only persistent memory**

   * Code + commits represent truth

4. **Reviews are diff-based, not document-based**

   * Opus evaluates git diffs against feature plan

---

# 📁 Project Structure

```
/plans/
  feature-name.md   (temporary, single feature only)
/src/
/tests/
```

Optional cleanup approaches:

* delete plan after completion
* or archive into `/plans/archive/`

---

# 🔁 Full Workflow Loop

## 1. Feature Planning (Opus)

Prompt Opus to generate a single-feature plan:

```
Generate a SINGLE-FEATURE implementation plan.
Do NOT create architecture documents.

Output format:
- Goal
- Constraints
- Acceptance Criteria
- Step breakdown (max 5 steps)

Feature:
<feature name>
```

Save output to:

```
/plans/feature-name.md
```

---

## 2. Implementation (Sonnet)

Sonnet consumes the plan and executes one feature incrementally:

```
Read /plans/feature-name.md

Implement ONLY the described feature.

Rules:
- no scope expansion
- no unrelated refactors
- minimal diff only

After completion:
- run tests/lint if applicable
- commit changes
```

Commit format:

```
feat: short description of feature

- summary of change
```

---

## 3. Code Review (Opus)

Opus reviews using BOTH plan + git diff:

```
You are reviewing a completed feature implementation.

INPUTS:
1. Feature plan:
/plans/feature-name.md

2. Git diff:
<git diff HEAD~1>

TASK:
Determine if implementation satisfies the plan.

Output ONLY:
- PASS or FAIL
- Bullet list of issues (if any)
- Minimal fix instructions (no redesign)
```

---

## 4. Fix Loop (Sonnet if needed)

If review fails:

```
Fix ONLY the issues listed below:
<Opus feedback>

Rules:
- no refactoring
- no new architecture
- minimal diff only
```

---

## 5. Plan Cleanup

After PASS:

Option A (delete):

```
rm /plans/feature-name.md
```

Option B (archive):

```
git add /plans/feature-name.md
git commit -m "archive: completed feature plan"
```

---

# 🔄 System Loop Summary

```
OPUS (plan feature)
   ↓
SONNET (implement)
   ↓
GIT (commit)
   ↓
OPUS (review diff vs plan)
   ↓
SONNET (fix if needed)
   ↓
CLEANUP (delete or archive plan)
```

---

# 🧩 Key Constraints

## Sonnet Rules

* only implement current feature
* no architecture changes
* no cross-feature refactors

## Opus Rules

* never write evolving documents
* only validate or define single-feature constraints
* always compare against git diff

---

# 🚀 Benefits of this Workflow

* Keeps planning lightweight and per-feature scoped
* Prevents architecture drift
* Eliminates stale documentation problems
* Uses git as the only durable state system
* Enables fast iterative development loops

---

# 🧠 Mental Model

> PLAN = temporary intent
> CODE = execution
> DIFF = truth
> OPUS = validator
> GIT = memory

---

# End of Document
