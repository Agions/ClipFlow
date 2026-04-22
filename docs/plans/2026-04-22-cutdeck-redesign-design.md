# CutDeck UI Redesign & Multi-Platform Release Plan

**Date:** 2026-04-22
**Version:** 1.0
**Status:** Approved — Proceeding to Phase 2
**Approved Decisions:**
- Timeline rebuild with shadcn components (not just restyle)
- Version: v2.0.0 (major release)
- `docs/plans/` excluded from Git (confirmed)
**Author:** claw @ Superpowers Pipeline

---

## 1. Context & Problem Statement

### 1.1 Current State

CutDeck v1.9.7 is a Tauri 2 + React 18 + TypeScript desktop app using:
- **UI Framework:** Ant Design 5 (~140 component files)
- **Styling:** CSS variables + Less variables,亮/暗 dual-theme
- **Build Targets:** nsis / msi / dmg / app / deb / rpm / appimage (configured in tauri.conf.json)
- **CI Status:** Only typecheck / lint / test / vite build — **no cross-platform release bundling**

### 1.2 Problems to Solve

| Problem | Impact |
|---------|--------|
| Ant Design 5 bundle size heavy (~800KB+ gzipped) | Slow cold start |
| No CI-based multi-platform release pipeline | Manual builds, error-prone |
| No GitHub Releases automation | No distributable installers |
| macOS app cannot run without signing workaround | Bad UX for macOS users |
| Design language not cohesive | "工具感"不足 |

### 1.3 Goal

Redesign UI with shadcn/ui + Tailwind CSS, establish a professional-tool design system, and build a complete Tag-triggered CI/CD pipeline that produces all 7 platform installers and uploads them to GitHub Releases automatically.

---

## 2. Design Language — Professional Tool Aesthetic

### 2.1 Visual Direction

**Reference:** DaVinci Resolve / Adobe Premiere Pro / Final Cut Pro
- **Dark-first:** Deep charcoal/near-black backgrounds
- **High contrast:** Bright accent on dark surfaces
- **Information density:** Dense but organized, clear visual hierarchy
- **Functional color coding:** Semantic colors for timeline tracks, clip types, export status

### 2.2 Color Palette

```css
/* === Color Tokens === */
--bg-primary: #0d0d0f;        /* Main background — near black */
--bg-secondary: #141418;      /* Panel backgrounds */
--bg-tertiary: #1a1a1f;       /* Cards, elevated surfaces */
--bg-hover: #222228;          /* Hover states */

--border-subtle: #2a2a30;     /* Subtle dividers */
--border-default: #3a3a42;     /* Default borders */

--text-primary: #f0f0f2;      /* Primary text */
--text-secondary: #8a8a96;    /* Secondary/muted text */
--text-disabled: #4a4a52;     /* Disabled text */

--accent-primary: #f97316;    /* Orange — primary actions, like Premiere */
--accent-primary-hover: #fb923c;
--accent-secondary: #3b82f6;  /* Blue — secondary actions, links */
--accent-success: #22c55e;   /* Green — success, export complete */
--accent-warning: #eab308;   /* Yellow — warnings */
--accent-danger: #ef4444;     /* Red — errors, delete */

--timeline-video: #8b5cf6;   /* Purple — video track */
--timeline-audio: #06b6d4;   /* Cyan — audio track */
--timeline-subtitle: #f59e0b;/* Amber — subtitle track */

/* Light theme (optional toggle) */
--light-bg-primary: #1a1a1f;
--light-bg-secondary: #f5f5f7;
--light-text-primary: #1a1a1f;
--light-accent-primary: #ea6a00;
```

### 2.3 Typography

- **Primary Font:** Inter (system fallback: -apple-system, Segoe UI)
- **Monospace:** JetBrains Mono (timecode, technical values)
- **Scale:**
  - `xs: 11px` — timestamps, badges
  - `sm: 12px` — labels, secondary
  - `base: 14px` — body
  - `lg: 16px` — section headers
  - `xl: 20px` — page titles
  - `2xl: 24px` — main headings

### 2.4 Spatial System

- **Base unit:** 4px
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64
- **Border radius:** 4px (inputs), 6px (cards), 8px (modals), 0px (buttons — sharp professional look)
- **Panel gaps:** 1px (tight, like NLE software — separates panels with thin bright lines on dark)

### 2.5 Motion Philosophy

- **Minimal & functional:** No decorative animations
- **Duration:** 100-150ms for micro-interactions, 200ms for panel transitions
- **Easing:** `ease-out` for reveals, `ease-in-out` for state changes
- **Timeline scrubbing:** Immediate, no animation (critical for professional UX)

### 2.6 Icon Library

**Lucide React** — Consistent 1.5px stroke, 24px grid. Matches professional tool aesthetic.

---

## 3. UI Architecture — Window & Panel System

### 3.1 Main Window Layout (Reference: Premiere Pro)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Menu Bar (File / Edit / View / Clip / Export / Help)              │
├───────────┬─────────────────────────────────────────┬───────────────┤
│           │  Source Monitor / Program Monitor       │   Inspector   │
│  Media    │  (Video Preview)                        │   Panel       │
│  Browser  │                                         │   (Properties)│
│  Panel    ├─────────────────────────────────────────┤               │
│           │                                         │               │
│           │  Timeline                               │               │
│           │  [Video Track 1 ████████░░░░████████░░] │               │
│           │  [Audio Track 1 ░░░░████████░░░░░░░░░░] │               │
│           │  [Subtitle Track ░░░░░░░░░████████░░░░░] │               │
├───────────┴─────────────────────────────────────────┴───────────────┤
│  Export Bar (Format: 9:16 / 1:1 / 16:9) | Progress | Export Button  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 shadcn/ui Component Migration Targets

**Phase 1 — Critical (must have for professional feel):**
- `Button` → Custom with sharp corners, orange primary
- `Dialog` / `Modal` → shadcn Dialog (Radix)
- `DropdownMenu` → shadcn DropdownMenu
- `Tabs` → shadcn Tabs (for timeline modes)
- `ScrollArea` → shadcn ScrollArea
- `Tooltip` → shadcn Tooltip
- `Progress` → shadcn Progress (for export progress)
- `Slider` → shadcn Slider (for timeline zoom, volume)
- `Switch` → shadcn Switch (for settings toggles)
- `Input` / `Textarea` → shadcn Input

**Phase 2 — Enhanced:**
- `Select` → shadcn Select
- `Checkbox` → shadcn Checkbox
- `Avatar` → shadcn Avatar
- `Badge` → Custom Badge (timeline track labels)
- `Card` → shadcn Card
- `Separator` → shadcn Separator

**Phase 3 — Polish:**
- `Table` → shadcn Table (for clip list, export queue)
- `Popover` → shadcn Popover
- `ContextMenu` → shadcn ContextMenu (right-click on timeline)

### 3.3 Components NOT to Migrate (Keep Ant Design)

These are heavily used and hard to replace; customize via CSS overrides:
- `Upload` — file drag/drop (use Ant's Upload with custom CSS)
- `DatePicker` / `TimePicker` — settings panels
- `Tree` — media browser folder structure

---

## 4. Technical Architecture

### 4.1 Tailwind CSS Configuration

```javascript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d0f',
          secondary: '#141418',
          tertiary: '#1a1a1f',
          hover: '#222228',
        },
        border: {
          subtle: '#2a2a30',
          DEFAULT: '#3a3a42',
        },
        text: {
          primary: '#f0f0f2',
          secondary: '#8a8a96',
          disabled: '#4a4a52',
        },
        accent: {
          primary: '#f97316',
          secondary: '#3b82f6',
        },
        timeline: {
          video: '#8b5cf6',
          audio: '#06b6d4',
          subtitle: '#f59e0b',
        },
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '6px',
        lg: '8px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

### 4.2 Project Structure After Migration

```
CutDeck/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (in project, not npm package)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── table.tsx
│   │   │   ├── popover.tsx
│   │   │   └── context-menu.tsx
│   │   ├── editor/               # Editor-specific components
│   │   │   ├── Timeline/
│   │   │   ├── Preview/
│   │   │   ├── Inspector/
│   │   │   └── MediaBrowser/
│   │   └── ...existing components...
│   ├── lib/
│   │   └── utils.ts              # cn() helper (shadcn standard)
│   └── styles/
│       └── globals.css           # Tailwind directives + CSS tokens
├── docs/
│   └── plans/                    # Design docs (NOT committed to git)
│       └── 2026-04-22-cutdeck-redesign-design.md  ← THIS FILE
└── ...
```

---

## 5. CI/CD Pipeline Design

### 5.1 GitHub Actions Workflow — `release.yml`

**Trigger:** `git tag` matching pattern `v*.*.*`

**Architecture:**
```
Tag Pushed
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  Job: create-release                                      │
│  ─────────────────────────────────────────────────────── │
│  • Extract version from tag                               │
│  • Create GitHub Release Draft                            │
│  • Set outputs: version, release_id                       │
└──────────────────────────────────────────────────────────┘
    │
    │ (matrix strategy for parallel platform builds)
    ▼
┌──────────────────────────────────────────────────────────┐
│  Matrix: [windows-latest, macos-latest, ubuntu-latest]   │
│                                                          │
│  For windows:  build-tauri --target x86_64-pc-windows-msvc
│                → produces: .exe, .msi, .nsis             │
│                                                          │
│  For macos:    build-tauri --target aarch64-apple-darwin │
│                             x86_64-apple-darwin          │
│                → produces: .app, .dmg                    │
│                → Note: ad-hoc signing, no notarization   │
│                                                          │
│  For ubuntu:   build-tauri --target x86_64-unknown-linux-gnu
│                             aarch64-unknown-linux-gnu   │
│                → produces: .deb, .rpm, .AppImage        │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  Job: upload-assets                                       │
│  ─────────────────────────────────────────────────────── │
│  • Download all platform artifacts                        │
│  • Upload each as Release Asset to the Draft Release      │
│  • Publish Release                                        │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Platform Build Matrix

| Platform | Target | Artifacts | Signing |
|----------|--------|-----------|---------|
| Windows x64 | `x86_64-pc-windows-msvc` | `.exe` (NSIS), `.msi` | None |
| macOS ARM64 | `aarch64-apple-darwin` | `.app`, `.dmg` | Ad-hoc only |
| macOS x64 | `x86_64-apple-darwin` | `.app`, `.dmg` | Ad-hoc only |
| Linux x64 | `x86_64-unknown-linux-gnu` | `.deb`, `.AppImage` | N/A |
| Linux ARM64 | `aarch64-unknown-linux-gnu` | `.deb`, `.AppImage` | N/A |

### 5.3 macOS Ad-hoc Signing & Run Solution

**Problem:** macOS blocks apps from unidentified developers by default.

**Solution — Two Pronged:**

#### CI Level (For Distribution):
```bash
# In release.yml — macOS build step
- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    args: --target aarch64-apple-darwin
- name: Create临时 DMG (no signing)
  run: |
    # Create a minimal DMG without signing
    # Include a "HOW-TO-RUN.txt" inside the DMG
```

#### User-Facing Instructions (Display on Release Page + In-App):

**For macOS users, on first launch:**
1. **Right-click** the CutDeck app → select **"Open"** (not double-click)
2. macOS will show a warning: *"CutDeck can't be opened because it is from an unidentified developer"*
3. Click **"Open Anyway"** (System Settings → Privacy & Security → scroll down → click **"Open Anyway"**)
4. App launches successfully ✅

**Alternative method:**
```bash
# In Terminal:
sudo xattr -rd com.apple.quarantine /Applications/CutDeck.app
```

### 5.4 Release Artifacts Naming Convention

```
CutDeck-{version}-windows-x64-setup.exe
CutDeck-{version}-windows-x64.msi
CutDeck-{version}-macos-arm64.dmg
CutDeck-{version}-macos-x64.dmg
CutDeck-{version}-linux-x64.deb
CutDeck-{version}-linux-arm64.deb
CutDeck-{version}-linux-x64.AppImage
CutDeck-{version}-linux-arm64.AppImage
```

---

## 6. Implementation Phases

### Phase 1: Infrastructure Setup
- [ ] Initialize Tailwind CSS in Vite project
- [ ] Install shadcn/ui CLI + configure
- [ ] Add core shadcn components (button, dialog, scroll-area, etc.)
- [ ] Set up `lib/utils.ts` with `cn()` helper
- [ ] Update `globals.css` with Tailwind directives + CSS tokens

### Phase 2: Core UI Migration (Critical Path)
- [ ] Replace Ant Design `Button` → shadcn `Button`
- [ ] Replace `Dialog` / `Modal` → shadcn `Dialog`
- [ ] Replace `DropdownMenu` → shadcn `DropdownMenu`
- [ ] Build Timeline panel with shadcn components
- [ ] Build Inspector panel with shadcn components
- [ ] Build Media Browser panel

### Phase 3: Editor Panel Completion
- [ ] Build Preview / Monitor panel
- [ ] Build Export Bar
- [ ] Build Menu Bar
- [ ] Settings dialog with custom styling

### Phase 4: CI/CD Pipeline
- [ ] Create `release.yml` workflow
- [ ] Configure Tauri build targets per platform
- [ ] Set up artifact upload to GitHub Release
- [ ] Test tag-triggered pipeline on a test tag
- [ ] Add `HOW-TO-RUN.txt` to macOS artifacts

### Phase 5: Polish & Documentation
- [ ] Dark theme / light theme toggle
- [ ] Keyboard shortcut overlay
- [ ] Update README with download instructions
- [ ] Release page visual design

---

## 7. Constraints & Non-Goals

### Constraints
- **No scope creep:** Do not add new features, only UI migration + CI/CD
- **TDD:** shadcn components come with tests; custom components need unit tests
- **Backward compat:** Existing project data (.cutdeck files) must still open
- **Docs stay local:** `docs/plans/` is excluded from Git via .gitignore

### Non-Goals (This Phase)
- Audio processing features
- Cloud sync
- Mobile companion app
- Plugin system

---

## 8. Verification Plan

| Phase | Verification |
|-------|-------------|
| Phase 1 | `npm run build` succeeds with Tailwind; shadcn components render correctly |
| Phase 2 | All critical editor panels functional; no Ant Design imports remain in Timeline/Inspector |
| Phase 3 | Full editor usable; export produces correct formats |
| Phase 4 | `git tag v1.9.8 && git push --tags` triggers CI → all 8 artifacts appear in GitHub Release |
| Phase 5 | Light theme toggle works; README accurate |

---

## 9. Open Questions (for User Approval)

1. **Timeline complexity** — Timeline panel is the hardest to migrate. Confirm: should we keep existing custom Timeline component (uses HTML5 `<canvas>` or DOM) and just restyle it, or rebuild with shadcn + custom canvas?
2. **Version bump** — Should this release be v1.9.8 (patch) or v2.0.0 (major)? The UI overhaul is significant.
3. **Docs domain** — Confirm: `docs/plans/` goes in `.gitignore`, correct?

---

*Document status: Awaiting user approval to proceed to Phase 2 (Writing Plans)*
