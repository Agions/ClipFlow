# CutDeck v2.0.0 — Implementation Plan

**Plan Date:** 2026-04-22
**Parent Design:** `2026-04-22-cutdeck-redesign-design.md`
**Status:** Ready for Execution

---

## Phase 1: Infrastructure Setup

### Task 1.1 — Initialize Tailwind CSS in Vite Project
**File:** `package.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `src/styles/globals.css`

**Steps:**
1. `npm install -D tailwindcss postcss autoprefixer @tailwindcss/vite`
2. Create `tailwind.config.ts` with professional-tool theme (colors from design doc Section 2)
3. Add Tailwind plugin to `vite.config.ts`
4. Replace `src/styles/variables.less` content with `globals.css` containing Tailwind directives + CSS tokens
5. Verify: `npm run build` succeeds

**Verification:** `npm run build` produces valid CSS output with Tailwind classes
**Test:** Manual — run `npm run dev`, check `http://localhost:1430` styles load

---

### Task 1.2 — Install and Configure shadcn/ui
**File:** `components.json`, `src/lib/utils.ts`, `src/components/ui/`

**Steps:**
1. `npx shadcn@latest init` — defaults: Tailwind, CSS variables, Inter font, 10px base
2. Configure `components.json` with correct paths
3. Verify `src/lib/utils.ts` has `cn()` function (clsx + tailwind-merge)
4. Test: compile and run dev server

**Verification:** `npx shadcn@latest init` completes without error, `src/lib/utils.ts` exists
**Test:** `npm run dev` shows base Tailwind styles

---

### Task 1.3 — Add Core shadcn Components (Phase 1)
**Files:** `src/components/ui/{button,dialog,dropdown-menu,scroll-area,tooltip,progress,slider,switch,input}.tsx`

**Steps:**
1. `npx shadcn@latest add button dialog dropdown-menu scroll-area tooltip progress slider switch input`
2. For each component, manually review the generated component code
3. Adjust color tokens to match design doc (orange primary `#f97316`, not default blue)
4. In `globals.css`, add `--accent-primary` / `--accent-secondary` CSS variables
5. Verify: all components render in dev server

**Verification:** Dev server shows each component type without errors
**Test:** `npm run build` — no TypeScript errors for new components

---

## Phase 2: Core UI Migration — Critical Path

### Task 2.1 — Replace Ant Design Button with shadcn Button
**Files:** `src/components/ui/button.tsx`, all files importing `antd Button`

**Steps:**
1. Add `button` via shadcn (if not done in 1.3): `npx shadcn@latest add button`
2. Update `button.tsx` to use `--accent-primary` (#f97316) as primary variant
3. Find all `import { Button } from 'antd'` usages across codebase
4. Replace with `import { Button } from '@/components/ui/button'`
5. For variant="primary" → className="bg-accent-primary hover:bg-accent-primary-hover"
6. Run `npm run type-check` and fix any import errors

**Verification:** All buttons use shadcn Button, orange primary theme
**Test:** `npm run test:run` — all tests pass
**Commit:** After each 10-file batch of replacements

---

### Task 2.2 — Replace Ant Design Dialog with shadcn Dialog
**Files:** `src/components/ui/dialog.tsx`, all dialog usages

**Steps:**
1. Add `npx shadcn@latest add dialog`
2. Update dialog styles in `globals.css` to match dark professional theme
3. Find all `<Modal>` and `<Dialog>` from antd usages
4. Replace with `<Dialog>` from shadcn
5. Style dialog overlay: `bg-black/80 backdrop-blur-sm`

**Verification:** All modals use shadcn Dialog, dark backdrop
**Test:** Open each dialog in the app and verify correct rendering

---

### Task 2.3 — Replace Ant Design DropdownMenu with shadcn DropdownMenu
**Files:** `src/components/ui/dropdown-menu.tsx`, menu usages

**Steps:**
1. Add `npx shadcn@latest add dropdown-menu`
2. Replace antd Dropdown / Menu components
3. Style dropdown with `--bg-tertiary` background and `--border-subtle` borders

**Verification:** All dropdowns use shadcn
**Test:** Click all dropdown menus in app

---

### Task 2.4 — Replace Ant Design Tabs with shadcn Tabs (Timeline Modes)
**Files:** `src/components/ui/tabs.tsx`, Timeline panel

**Steps:**
1. Add `npx shadcn@latest add tabs`
2. Find `<Tabs>` from antd in editor components
3. Replace with shadcn Tabs
4. Style tab list: dark background, orange active indicator

**Verification:** Timeline mode switching uses shadcn Tabs
**Test:** Switch between all timeline modes

---

### Task 2.5 — Replace Ant Design ScrollArea with shadcn ScrollArea
**Files:** `src/components/ui/scroll-area.tsx`, Inspector panel, Media Browser

**Steps:**
1. Add `npx shadcn@latest add scroll-area`
2. Replace antd `Scrollable` / custom scroll implementations
3. Style scrollbar: thin, dark (`--border-subtle` track, `--text-disabled` thumb)

**Verification:** All scroll areas use shadcn ScrollArea
**Test:** Scroll all panels, verify scrollbar visibility

---

### Task 2.6 — Replace Ant Design Progress with shadcn Progress (Export)
**Files:** `src/components/ui/progress.tsx`, Export panel

**Steps:**
1. Add `npx shadcn@latest add progress`
2. Replace export progress bars
3. Style: orange fill for primary, green for success

**Verification:** Export progress shows correct percentage
**Test:** Trigger an export, verify progress bar animates correctly

---

### Task 2.7 — Replace Ant Design Slider with shadcn Slider (Timeline Zoom)
**Files:** `src/components/ui/slider.tsx`, Timeline zoom control

**Steps:**
1. Add `npx shadcn@latest add slider`
2. Replace timeline zoom slider
3. Style: orange track, dark thumb

**Verification:** Timeline zoom slider functional
**Test:** Zoom in/out on timeline, verify smooth interaction

---

## Phase 3: Editor Panel Rebuild with shadcn

### Task 3.1 — Build Timeline Panel (shadcn Reconstruction)
**Files:** `src/components/editor/Timeline/` (new), `src/components/CutDeck/Workspace/ClipRippling.tsx`

**Steps:**
1. Create `src/components/editor/Timeline/` directory
2. Build sub-components:
   - `TimelineTrack.tsx` — video/audio/subtitle track row (shadcn Slider + custom canvas)
   - `TimelineClip.tsx` — individual clip on track (shadcn Card variant)
   - `TimelineRuler.tsx` — timecode ruler (JetBrains Mono font)
   - `TimelineToolbar.tsx` — zoom/playback controls (shadcn Button + Tooltip)
   - `TimelineScrubber.tsx` — playhead (orange vertical line)
3. Compose in `TimelinePanel.tsx`
4. Remove antd dependencies from timeline components
5. Integrate with existing `core/hooks/useTimeline.ts`

**Verification:** Timeline renders with 3 tracks, clips draggable, playhead moves
**Test:** Load a project, play/pause, scrub, zoom
**Note:** Canvas-based rendering preserved for performance, wrapped in shadcn container

---

### Task 3.2 — Build Inspector Panel
**Files:** `src/components/editor/Inspector/`

**Steps:**
1. Create `src/components/editor/Inspector/` directory
2. Build:
   - `InspectorPanel.tsx` — container with shadcn ScrollArea
   - `ClipProperties.tsx` — clip info (shadcn Input, Slider, Switch)
   - `EffectsPanel.tsx` — effects list (shadcn Card, Switch)
   - `MetadataPanel.tsx` — metadata display (shadcn Table variant)
3. Replace existing Inspector with new shadcn version

**Verification:** Inspector shows clip properties, updates on selection
**Test:** Select different clips, verify property panel updates

---

### Task 3.3 — Build Media Browser Panel
**Files:** `src/components/editor/MediaBrowser/`

**Steps:**
1. Create `src/components/editor/MediaBrowser/` directory
2. Build:
   - `MediaBrowserPanel.tsx` — shadcn ScrollArea container
   - `MediaItem.tsx` — thumbnail + name (shadcn Card variant)
   - `FolderTree.tsx` — folder navigation (shadcn Tree-like with nested elements)
3. Keep antd Upload for drag-drop (customized with CSS)
4. Add context menu with shadcn ContextMenu

**Verification:** Media browser shows project files, folder navigation works
**Test:** Navigate folders, drag file to timeline

---

### Task 3.4 — Build Preview / Monitor Panel
**Files:** `src/components/editor/Preview/`

**Steps:**
1. Create `src/components/editor/Preview/` directory
2. Build:
   - `PreviewPanel.tsx` — video display area (dark background)
   - `PlaybackControls.tsx` — play/pause/frame-step (shadcn Button group)
   - `TimecodeDisplay.tsx` — current time (JetBrains Mono, `--text-secondary`)
3. Integrate with existing `core/services/video.ts`

**Verification:** Preview plays video, timecode updates, controls responsive
**Test:** Play/pause, step forward/back frame by frame

---

### Task 3.5 — Build Export Bar
**Files:** `src/components/editor/ExportBar/`

**Steps:**
1. Create `src/components/editor/ExportBar/` directory
2. Build:
   - `ExportBar.tsx` — bottom bar (fixed position)
   - `FormatSelector.tsx` — 9:16 / 1:1 / 16:9 buttons (shadcn Button variant="outline")
   - `ExportProgress.tsx` — export progress (shadcn Progress)
   - `ExportButton.tsx` — primary action (shadcn Button, orange)
3. Style: `--bg-secondary` background, 1px top border

**Verification:** Export bar shows format options, triggers export
**Test:** Select format, start export, verify progress bar

---

### Task 3.6 — Build Menu Bar
**Files:** `src/components/MenuBar/`, `src/App.tsx`

**Steps:**
1. Create `src/components/MenuBar/` directory
2. Build:
   - `MenuBar.tsx` — horizontal menu (File / Edit / View / Clip / Export / Help)
   - `MenuItem.tsx` — each menu item with dropdown (shadcn DropdownMenu)
3. Style: `--bg-secondary` background, `--text-primary` text, hover `--bg-hover`
4. Replace existing menu bar

**Verification:** All menu items open, shortcuts display
**Test:** Click each menu, verify dropdowns

---

### Task 3.7 — Build Settings Dialog
**Files:** `src/components/Settings/`

**Steps:**
1. Create `src/components/Settings/` directory
2. Build:
   - `SettingsDialog.tsx` — shadcn Dialog container
   - `AISettings.tsx` — API key config (shadcn Input, Select)
   - `AppearanceSettings.tsx` — theme toggle (shadcn Switch)
   - `ShortcutSettings.tsx` — keyboard shortcuts table (shadcn Table)
   - `ExportSettings.tsx` — default export format (shadcn Select)
3. Style to match professional-tool aesthetic

**Verification:** Settings dialog opens, all tabs functional
**Test:** Change settings, close and reopen, verify persistence

---

## Phase 4: CI/CD Pipeline

### Task 4.1 — Create release.yml Workflow
**File:** `.github/workflows/release.yml` (new)

**Steps:**
1. Create `.github/workflows/release.yml`
2. Trigger: `push tags matching v*.*.*`
3. Jobs:
   - `create-release` — create GitHub Release Draft
   - `build-windows` — run on `windows-latest`, build nsis + msi
   - `build-macos` — run on `macos-latest`, build dmg + app (ad-hoc)
   - `build-linux` — run on `ubuntu-latest`, build deb + AppImage
   - `upload-assets` — download artifacts, upload to Release
4. Use `tauri-apps/tauri-action@v0` for builds
5. Configure secrets: `TAURI_SIGNING_PRIVATE_KEY` (optional, skip for now)
6. Add `HOW-TO-RUN.txt` to macOS artifacts (instructions for allowing unsigned app)

**Verification:** Workflow syntax valid (no YAML errors)
**Test:** On a test tag push, verify workflow triggers

---

### Task 4.2 — Configure Tauri Multi-Platform Build Targets
**File:** `src-tauri/tauri.conf.json`

**Steps:**
1. Update `bundle.targets` — ensure all 7 targets active
2. Add `target` overrides per job in `release.yml`
3. Configure macOS build:
   - Set `macOS.signingIdentity: null`
   - Set `macOS/entitlements: null`
   - Add post-build step to create DMG without signing
4. Configure Linux build dependencies in `beforeBuildCommand` or CI setup

**Verification:** Each platform builds without errors on its CI runner
**Test:** Full CI run on test tag

---

### Task 4.3 — Add macOS Run Instructions to Artifacts
**Files:** `scripts/create-run-instructions.sh`, included in DMG

**Steps:**
1. Create `scripts/create-run-instructions.sh`
2. Generate `HOW-TO-RUN.txt` with instructions:
   - Right-click → Open → Allow
   - Terminal command alternative
3. Include this file in macOS DMG build step

**Verification:** `HOW-TO-RUN.txt` appears inside macOS artifacts
**Test:** Download macOS DMG, inspect contents

---

### Task 4.4 — Test Full CI/CD Pipeline
**Steps:**
1. Create test tag: `git tag v1.9.8-test && git push origin v1.9.8-test`
2. Monitor CI run at `https://github.com/Agions/CutDeck/actions`
3. Verify all 8 artifacts appear in Release
4. Clean up test tag after verification

**Verification:** 8 artifacts uploaded to GitHub Release
**Test:** Download each artifact, verify it installs/runs

---

## Phase 5: Polish & Documentation

### Task 5.1 — Dark / Light Theme Toggle
**Files:** `src/context/ThemeContext.tsx`, `src/styles/globals.css`

**Steps:**
1. Keep existing `ThemeContext.tsx`
2. Update `globals.css` light theme variables
3. Add light theme shadcn component overrides
4. Verify all 140+ components support both themes

**Verification:** Toggle between dark and light theme without visual breakage
**Test:** Toggle in Settings, verify all panels update

---

### Task 5.2 — Keyboard Shortcut Overlay
**Files:** `src/components/ShortcutOverlay.tsx`

**Steps:**
1. Create `src/components/ShortcutOverlay.tsx`
2. Trigger: `?` key or menu `Help → Keyboard Shortcuts`
3. Display overlay with all shortcuts (shadcn Table)
4. Style: centered dialog, dark backdrop

**Verification:** Overlay shows all shortcuts
**Test:** Press `?` key, verify overlay appears

---

### Task 5.3 — Update README
**Files:** `README.md`

**Steps:**
1. Update version to v2.0.0
2. Add "Download Installers" section pointing to Releases
3. Update tech stack to mention shadcn/ui + Tailwind CSS
4. Add shadcn component list
5. Add macOS run instructions link

**Verification:** README accurate and complete
**Test:** Read through, verify all links work

---

### Task 5.4 — Final Verification & Version Bump
**Files:** `package.json`, `src-tauri/Cargo.toml`, `CHANGELOG.md`, `tauri.conf.json`

**Steps:**
1. Update `package.json` version to `2.0.0`
2. Update `src-tauri/Cargo.toml` version to `2.0.0`
3. Update `src-tauri/tauri.conf.json` version to `2.0.0`
4. Update `CHANGELOG.md` with v2.0.0 changes:
   - shadcn/ui migration
   - Professional tool aesthetic
   - Multi-platform CI/CD pipeline
5. Run full test suite: `npm run test:run && npm run type-check && npm run lint`
6. Commit: "CutDeck v2.0.0"

**Verification:** All tests pass, version numbers consistent
**Test:** `npm run test:run` — 208 tests pass

---

## Execution Modes

### Mode A: Subagent-Driven (Recommended)
I spawn subagents per task group:
- **Subagent 1:** Phase 1 (Infrastructure) — Tasks 1.1–1.3
- **Subagent 2:** Phase 2 (Core UI Migration) — Tasks 2.1–2.7
- **Subagent 3:** Phase 3 (Editor Panel Rebuild) — Tasks 3.1–3.7
- **Subagent 4:** Phase 4 (CI/CD) — Tasks 4.1–4.4
- **Subagent 5:** Phase 5 (Polish) — Tasks 5.1–5.4

Each subagent follows TDD: write test → watch fail → implement → watch pass → commit.

### Mode B: Manual Execution
I guide you through each task step-by-step in this session. Slower but more control.

---

**Recommendation:** Use **Mode A (Subagent-Driven)** — each phase is independent and can run in parallel.

**Preference?** Mode A or Mode B?
