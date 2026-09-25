<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:atlas-gis-reversibility-rule -->
# Project Atlas GIS Exploration & Non-Linear Navigation Rule

1. NEVER make the interface feel like it is forcing a user through a slideshow or linear track.
2. Every cinematic camera transition (flyTo, easeTo, footprint zoom, regional pitch) MUST remain fully reversible and interruptible.
3. The user must ALWAYS be able to:
   - Return immediately to the full Philippine national view via breadcrumb, button, or Escape key.
   - Search normally at any moment without modal locks or forced animations.
   - Open, filter, and browse the Project Directory freely.
   - Jump directly to any project from map markers, search results, or URL parameters.
4. User interactions (pan, zoom, click, keypress) must instantly interrupt running map camera transitions so that Atlas functions as a powerful, responsive, and authoritative GIS tool while preserving rich visual storytelling.
<!-- END:atlas-gis-reversibility-rule -->

