---
name: git-workflow
description: Git in this repo for a designer. /git-workflow (or "где мы по гиту?") shows where the current task is in the branch → commit → push → PR → merge cycle and what to do next; /git-workflow guide publishes the visual explainer; /git-workflow pr prepares the end-of-task pull request with a merge-method recommendation.
---

# git-workflow

The reader is a designer. Answer in their language (Russian in chat), keep it short, and never run anything that touches `main` or rewrites shared history. The full rule set and the "when to do what" table live in `docs/git-workflow.md`; the process rules in `CLAUDE.md` win if the two ever disagree.

Argument: `$ARGUMENTS` — one of `status` (default when empty), `guide`, `pr`.

## `status` (default)

Show where the task is in the cycle and what the next step is. Gather, then report in one short block:

```bash
git branch --show-current
git status --short
git log --oneline main..HEAD
git log --oneline @{u}..HEAD 2>/dev/null   # unpushed commits; if no upstream, say the branch was never pushed
gh pr list --head "$(git branch --show-current)" --state all --json number,state,url
```

Report as: **ветка** → **незакоммичено** (N файлов) → **не запушено** (N коммитов) → **PR** (нет / #N открыт / #N влит). Then one line: what the next sensible action is, using the trigger table in `docs/git-workflow.md`. If the branch is `main`, say so first and offer to create `feature/<task>` — never commit on `main`.

## `guide`

Publish the visual explainer as an Artifact: the file is `guide.html` next to this SKILL.md (favicon 🌳, title from the file). Before publishing, refresh the numbers it quotes if they drifted: total merged PRs, largest branch size, count of already-merged remote branches. Get them with:

```bash
gh pr list --state merged --limit 100 --json number,commits | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), max(len(p['commits']) for p in d))"
git fetch -q && for b in $(git branch -r | grep -v -e HEAD -e main); do [ "$(git rev-list --count main..$b)" -gt 0 ] && echo "$b"; done | wc -l
```

Update the "Как это выглядело у нас" and "Что мы делаем не так" cards and the "31 PR" mention in the chapter 7 intro, then publish. Do not restyle the page unless asked.

## `pr`

End-of-task pull request, per `CLAUDE.md` ("один PR на задачу, в конце") and the merge-advice rule:

1. Confirm the task is closed with the user if it is not obvious. Do not open a PR per commit.
2. Show the facts first: `git log --oneline main..HEAD` and `git diff --stat main..HEAD`.
3. Push the branch: `git push -u origin <branch>`.
4. `gh pr create --base main` with a title in the repo's style (Russian, "Область: что сделано") and a body that lists what changed and why. End the body with the attribution line the harness asks for.
5. Recommend a merge method tied to *these* commits, one sentence of why. Default **squash** (many small commits of one task → one line in `main`). **Merge commit** only when the per-commit history is worth keeping (a long multi-phase piece someone may want to revert step by step). **Rebase** practically never here.
6. Do not press merge yourself unless the user says so explicitly. After merge, remind to delete the branch.

## Hard rules (repeat them if the user asks to break one)

- `main` is entered only through a pull request. "Слей в main" means "open a PR".
- Never `git push origin HEAD:main`, never force-push a branch someone else has fetched, never rebase commits that are already in `main`.
- In a worktree, never bare `git stash` / `git stash pop`: the stash stack is shared across all worktrees. Use a WIP commit instead.
