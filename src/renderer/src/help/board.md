# Task Queue

The task queue lets you line up tasks and run them as Claude Code sessions. Tasks live here *before* they become active sessions — ideas you're parking and work you're ready to spin up.

[Open the Task Queue](clave://navigate/board)

## How It Works

Tasks are organized into two sections:

- **Ready** — tasks you intend to run soon
- **Backlog** — ideas you've parked for later

Both sections are collapsible and drag-and-droppable. Move a task between sections by dragging it or via the right-click menu.

## Creating Tasks

Click the **+** button in the header of either section to create a task there. Each task can have:

- **Title**: A short label for the task
- **Prompt**: The exact prompt to send to Claude (required to run)
- **Folder**: Working directory for the session (required)
- **Skip permissions**: Optionally run with `--dangerously-skip-permissions`
- **Tags**: Free-form labels for grouping and filtering

## Running Tasks

Click the green **Run** button on a task row (visible on hover), or open the task and click **Run** in the edit modal. Running a task:

1. Spawns a new Claude Code session in the task's folder
2. Sends the prompt automatically
3. Removes the task from the queue

Clicking the row itself opens the **edit** modal — it does not run the task.

## Editing and Deleting

- **Edit**: Click a task row, or right-click → **Edit**
- **Delete**: Hover the task and click the trash icon, right-click → **Delete**, or use the trash icon inside the edit modal. All paths ask for confirmation.
- **Move between sections**: Drag the task, or right-click → **Move to Ready** / **Move to Backlog**

## Tags

Tags let you group tasks by theme (`coding`, `newsletter`, `research`, …). Add them from the task form or from the right-click **Tags** submenu on any row. Tags are color-coded — a color is picked automatically when you create a tag, and you can change it later.

### Filtering by tag

When you have at least one tag, a filter bar appears above the sections:

- **Click** a tag chip to toggle it as a filter. Multi-select is **OR** — a task matches if it has *any* selected tag.
- Selected filters show a darker, more saturated chip. Unselected chips are muted.
- The **×** next to the bar clears all active filters.

### Editing a tag

Hover a tag chip in the filter bar — a small pencil button appears next to it. Click it to open the tag editor, where you can:

- Rename the tag (all tasks using it update automatically)
- Change its color
- Delete the tag (it will be removed from every task)

Right-clicking a chip also opens the editor.

## Persistence

Tasks, tags, and section collapsed/expanded state are persisted locally and survive app restarts. Filters are session-only — they reset when you relaunch the app.
