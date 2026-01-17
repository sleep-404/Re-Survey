# BoundaryAI - Claude Code Instructions

## Project Overview
Land parcel boundary editing tool for Andhra Pradesh resurvey project. React + Tailwind + MapLibre GL JS.

## Development Practices

### Commit Strategy
- **Commit every file as you create or update it**
- Use descriptive commit messages following conventional commits:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `refactor:` for code restructuring
  - `docs:` for documentation
  - `chore:` for tooling/config changes
- Keep commits atomic and focused

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
