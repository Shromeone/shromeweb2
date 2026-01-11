# Copilot Instructions for ShromeWeb2

## Architecture Overview
This is a SvelteKit application with utility tools organized as individual routes. Each route (`/typing`, `/text-replacer`, `/gas`, etc.) is a self-contained tool with no shared global state. Components and data files are colocated within route directories.

## Key Patterns
- **Svelte 5 Runes**: Use `$state()`, `$derived()`, `$effect()` for reactive state. Example: `let volume = $state(400); let averageHitsPerSecond = $derived(() => { ... });`
- **Legacy Compatibility**: Import `run`, `handlers` from `svelte/legacy` for event handling. Use `onMount`, `onDestroy` for lifecycle.
- **Local Components**: Place reusable components (e.g., `Input.svelte`, `Checkbox.svelte`) in the same route directory where used, not in a global `/components` folder.
- **Utility Imports**: Access utilities via `$lib/utils/`. Example: `import { timeToChinese } from "$lib/utils/time-converter.js";`
- **Data Files**: Store JSON data (passages, configs) directly in route folders. Example: `src/routes/typing/passages.json`
- **Canvas Graphics**: For visual simulations, use HTML5 Canvas with `setInterval` for animation loops. Example: `src/routes/gas/+page.svelte`

## Development Workflow
- **Start Dev Server**: `npm run dev` (Vite dev server on http://localhost:5173/)
- **Build**: `npm run build` (outputs to `.svelte-kit/`)
- **Preview**: `npm run preview` (serve built app locally)
- No automated tests or linting configured

## Conventions
- **Chinese Localization**: Include Chinese text for UI elements (e.g., "打字練習" for typing practice, time display as "分鐘秒")
- **Version Footer**: Update version in `src/routes/+layout.svelte` footer on releases
- **Navigation**: Add new routes to nav in `+layout.svelte`; comment out inactive routes
- **Error Handling**: Use try-catch for user inputs (e.g., regex validation in text-replacer)
- **Performance**: Use `tick()` for DOM updates after state changes in complex interactions

## Examples
- Typing game logic: `src/routes/typing/+page.svelte` (WPM calculation, composition handling)
- Regex replacement: `src/routes/text-replacer/+page.svelte` (dynamic replace functions, option toggles)
- Particle simulation: `src/routes/gas/+page.svelte` (canvas rendering, physics calculations)</content>
<parameter name="filePath">c:\Users\longp\shromeweb2\.github\copilot-instructions.md