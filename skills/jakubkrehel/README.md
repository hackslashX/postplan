<a href="https://interfaces.dev/">
  <img width="320" height="168" alt="interfaces.dev" src="https://ho1jr3x2dcwdu3t5.public.blob.vercel-storage.com/interfaces-og-image.png" />
</a>

[![skills.sh](https://skills.sh/b/jakubkrehel/skills)](https://skills.sh/jakubkrehel/skills)

A collection of agent skills that help with various parts of building a great interface. From animation and UI polish to accessibility and product writing.

## Skills

- [**better-interface**](skills/better-interface/SKILL.md): A user-invoked, cross-discipline interface review that coordinates every skill below.
- [**better-ui**](skills/better-ui/SKILL.md): Design engineering details that make interfaces feel polished: border radius, shadows, animations and micro-interactions.
- [**better-typography**](skills/better-typography/SKILL.md): Web typography from choosing fonts to spacing, wrapping and accessibility.
- [**better-colors**](skills/better-colors/SKILL.md): OKLCH color space: palette generation, contrast, gamut handling and theming.
- [**better-accessibility**](skills/better-accessibility/SKILL.md): Focus states, keyboard support, ARIA, forms, screen readers, hit areas and motion.
- [**better-layout**](skills/better-layout/SKILL.md): Layout structure, grouping, alignment, reading order, progressive disclosure and adaptive breakpoints.
- [**better-writing**](skills/better-writing/SKILL.md): UX writing and interface copy, from button labels to errors, settings and empty states.

## Install

### As a Claude Code plugin

Installs all seven skills together and updates in place. Run these inside Claude Code:

```text
/plugin marketplace add jakubkrehel/skills
/plugin install interfaces@interfaces
```

### With the skills CLI

Works in Claude Code, Codex and other agents. You can choose which skills to install or install all of them. `better-interface` coordinates the other six skills, so install the complete collection when you want holistic reviews.

```bash
npx skills add jakubkrehel/skills
```

```bash
npx skills add jakubkrehel/skills --skill '*'
```

## Use

The default review mode is `full`. Pass `quick` for a shorter review, and add the screen, flow, or feature after the mode.

In Claude Code, as a plugin. Plugin skills are namespaced, so every skill is prefixed with `interfaces:`.

```text
/interfaces:better-interface
/interfaces:better-interface quick
/interfaces:better-interface full checkout flow
```

In Claude Code, installed with the skills CLI:

```text
/better-interface
/better-interface quick
/better-interface full checkout flow
```

In Codex:

```text
$better-interface
$better-interface quick
$better-interface full checkout flow
```

The prefix only affects skills you invoke by name. The other six skills are picked up automatically from context either way.
