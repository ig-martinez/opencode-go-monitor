# Agent Skills — opencode-go-monitor-ft-copilot-pacer

This file registers project-specific skills for AI agents working in this repository.

## Project-Level Skills

| Skill | Description | Path |
|-------|-------------|------|
| `opencode-go-pacer-release` | Release workflow for the VSCode extension — merge-based branching, CI branch validation, version bump, release notes format, VSIX packaging | [SKILL.md](skills/opencode-go-monitor-release/SKILL.md) |

## How to Use

When an AI agent is asked to prepare a release, bump the version, write release notes, or package the `.vsix` for this repo, it MUST load the `opencode-go-pacer-release` skill before proceeding.
