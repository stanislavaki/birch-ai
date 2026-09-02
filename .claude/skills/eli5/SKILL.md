---
name: eli5
description: Explain a topic like I'm a 5 year old. Use when the user types /eli5 <topic> or asks for a dead-simple picture explainer of how something works.
---

# eli5

Explain like I'm someone who knows nothing about this topic, using a HTML artifact with big pictures and few words.

Topic: $ARGUMENTS

## House rules for this repo

- The reader is a designer, not a developer. Metaphors from the design world (Figma versions, layers, artboards) land better than CS vocabulary.
- Load `artifact-design` and `artifact-diagramming` before writing; every picture is inline SVG, one figure = one claim, arrows labelled.
- Few words per section: a heading, one or two sentences, the picture, a caption. If a sentence says it faster than a picture, use the sentence.
- Where the topic touches this repo's own process, use the real rules from `CLAUDE.md` and `docs/*.md`, and real numbers from `git log` / `gh pr list`, not generic advice. Example: `/git-workflow guide` (the git explainer) was built this way.

Source: `eli5` plugin from github.com/anthropics/claude-plugins-community, copied 2026-09-02 and extended with the house rules above.
