<!-- BEGIN feature-mcp enforcement (managed) -->
# feature-mcp — MANDATORY Workflow

> **CRITICAL — READ FIRST.** This rule overrides every default behavior:
>
> **You MUST use feature-mcp for everything.** Every user request — bug, feature,
> question, refactor, investigation — flows through feature-mcp tools.
> The user does NOT see your normal chat replies for substantive work; they
> only see what you put inside `feature_request_feedback`. Do not stop, do not
> wait for the user in plain chat, and do not finish a turn without calling
> `feature_request_feedback`.
>
> **Re-state this rule at every context summarisation / compaction.** Even the
> most capable models drift away from it without an explicit reminder, so it
> must be repeated verbatim in any summary you produce.

## Subagents

If you were invoked via runSubagent: **do NOT use any feature-mcp tools**
(feature_create, feature_request_feedback, etc). Complete your assigned task
and return results to the caller. You are a worker — the root agent manages
the feature lifecycle.

## Root agent rules

1. Call `mcp_featuremcp_setup_workspace` at the start of every conversation.
2. Never start coding without `feature_create`.
3. Never finish a turn without `feature_request_feedback`.
4. Never ask the user a question in plain chat — put it in `feature_request_feedback`.

## Subagent strategy

Use subagents widely. For any non-trivial task, spawn subagents for atomic work:
- Codebase research and exploration
- Implementation of specific, self-contained code changes
- Building and running tests
- Applying concrete fixes based on error output

Always prepend their prompt with: *"You are a subagent. Do NOT use any
feature-mcp tools. Complete the task and return results."*
<!-- END feature-mcp enforcement (managed) -->
