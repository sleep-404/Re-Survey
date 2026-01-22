# BoundaryAI - Claude Code Instructions

## Project Overview
Land parcel boundary editing tool for Andhra Pradesh resurvey project. React + Tailwind + MapLibre GL JS.

## Development Practices

### Commit Strategy

**CRITICAL: Commit immediately after EVERY file change**

1. **One file = One commit** — As soon as you create or update a file, commit it immediately
2. **Never wait** — Do NOT batch changes or wait until the end of a task
3. **Never skip** — Every single file change gets its own commit

**Commit message format (conventional commits):**
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code restructuring
- `docs:` for documentation
- `chore:` for tooling/config changes

**Rules:**
- Keep commits atomic and focused (one file, one purpose)
- **Never include yourself as commit author** — use the default git config
- If a task involves multiple files, commit each file separately as you complete it
- Only batch tightly-coupled files (e.g., component + its types in same commit)

**Example workflow:**
```
1. Create useAuthStore.ts → git add → git commit -m "feat: Add auth store with login/logout"
2. Create LoginScreen.tsx → git add → git commit -m "feat: Add login screen component"
3. Update main.tsx → git add → git commit -m "feat: Add routing to main.tsx"
```

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Zustand for state management
- Tailwind CSS for styling (no inline styles)
- Use absolute imports from `@/`

### File Organization
```
src/
├── components/    # React components grouped by feature
├── hooks/         # Custom React hooks and Zustand stores
├── utils/         # Pure utility functions
├── types/         # TypeScript type definitions
├── constants/     # Static configuration
└── App.tsx        # Root component
```

### Testing
- Test files adjacent to source: `Component.tsx` + `Component.test.tsx`
- Run `npm test` before major commits

## Key Data Files
- ORI tiles: `public/tiles/{z}/{x}/{y}.png`
- SAM segments: `public/data/sam_segments.geojson`
- Ground truth: `public/data/ground_truth.geojson`

## Reference Docs
- Implementation plan: `docs/implementation-plan.md`
- Orientation transcript: `Land Resurvey orientation session.txt`
