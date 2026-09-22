# Landing page `/en` — cinematic scroll storytelling

## Root cause removed

The previous cinematic implementation used `public/images/segments/retail-banking-orchestration.png` as a full-screen poster/background. That is a feature infographic with dense pre-rendered text, so it competed with the hero heading and looked like a darkened presentation slide.

The asset remains in the repository for its original journey/segment use, but it is no longer referenced by the landing cinematic.

## Current implementation

`src/components/landing/ScrollVideoExperience.tsx` is a CSS/HTML scroll storyboard, deliberately used while no valid independent cinematic video asset is available.

- The first viewport is an immediate clean navy/gold brand frame.
- The sticky stage is `400vh`, positioned below the 72px sticky header, and uses the usable viewport height.
- It uses no feature screenshots, background image, canvas, WebGL, autoplay video, or animation library.
- A passive scroll listener schedules one `requestAnimationFrame` update. The frame updates CSS custom properties instead of React state for every pixel.
- React state changes only when the active scene changes; IntersectionObserver only pauses work outside the nearby viewport.
- Full listener, observer and animation-frame cleanup is included.

## Storyboard timeline

1. **0–20% — Brand**: clean title frame and a gold data path begins to draw.
2. **20–45% — Platform**: three large HTML-rendered workspace panels enter; no dashboard screenshot is used.
3. **45–70% — Methodology**: panels clear and three pillars connect through a gold line.
4. **70–90% — Member value**: pillars make way for three restrained membership benefits.
5. **90–100% — Exit**: continuation cue appears and the sticky stage releases naturally into Platform Overview.

Scrolling backward reverses the same progress values and restores the preceding composition without wheel/touch interception or scroll snapping.

## Supporting files

- `src/components/landing/LandingPage.tsx` — renders the cinematic component before existing landing sections.
- `src/app/globals.css` — cinematic composition and responsive/reduced-motion styles.
- `src/components/ui/Reveal.tsx` — lower content still uses small one-time reveals; this does not drive the cinematic stage.

## Accessibility and performance

- `prefers-reduced-motion` collapses the long cinematic region to one static, readable brand viewport.
- The visual stage has no horizontal overflow and all foreground copy is HTML.
- Existing header, navigation anchors, membership logic, CTA targets, FAQ and authentication flows are unchanged.

## Asset status

No cinematic MP4 asset is currently in `public`. A real video must be an independently produced navy/gold cinematic asset, not an infographic or product screenshot. Until one exists, the CSS/HTML storyboard is the intentional fallback.

## Validation

- `npm run build` passes.
- Browser QA covered desktop opening, platform/methodology progression, end-of-cinematic content continuation, navigation to FAQ, no console errors and no horizontal overflow.
- Mobile viewport (390×844) renders without overflow.

## Release safety

- No Git commit, push or production deployment was performed.
- Existing checkpoint: `eb46fe6`.
- Existing backup branch: `backup/pre-video-scroll-20260922`.
