# ShromeWeb2

A SvelteKit web application with various utilities and tools.

## Running Locally

### Prerequisites

- Node.js (version 16 or higher recommended)
- npm (comes with Node.js)

### Setup Steps

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

   The server will start and you'll see output like:
   ```
   VITE v5.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

3. **Open in browser**:
   - Navigate to `http://localhost:5173/` in your web browser
   - Or use the `--open` flag to automatically open:
     ```bash
     npm run dev -- --open
     ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Project Structure

- `/src/routes` - Application pages and routes
- `/src/lib` - Shared components and utilities
- `/static` - Static assets (images, etc.)

## Development

The development server supports hot module replacement (HMR), so changes to your code will automatically refresh in the browser.
