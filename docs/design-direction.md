# Lephas — Design Direction

**Our identity comes first.** Everything below is adapted to Lephas's own look: a calm, confident **sage-grey neumorphic glass** surface over a subtle tech background, with **warm beige (#c8a97e)** accents and dark slate text. We borrow *principles* from the best studios — never their assets or exact screens — and make them feel like Lephas.

Stack reminder: React 19 + Vite, Tailwind v4 (`@theme` tokens in `src/index.css`), existing component classes (`neu`, `neu-hover`, `btn`, `btn-primary`, `glass-bar`, `chip`, `field`, `icon-well`, `eyebrow`). Keep using these — the guide extends them, it doesn't replace them.

---

## 1. Animation — *the Apple principle* (keep our neumorphism)
**What Apple does well:** motion is physics-based, purposeful, and quiet. Things ease in with spring-like curves, never linear; nothing moves without a reason.

**Lephas rules**
- Define motion tokens once: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, durations `--dur-1: 160ms`, `--dur-2: 240ms`, `--dur-3: 420ms`.
- Default transition for interactive surfaces: `transition: transform var(--dur-2) var(--ease-out), box-shadow var(--dur-2) var(--ease-out)`.
- Neumorphism + motion: on hover a `neu` card lifts `translateY(-3px)` and its shadow deepens; on press it sinks to `neu-inset`. The soft shadow *is* the depth — animate the shadow, not a flat color.
- Always respect `prefers-reduced-motion` (we already do) — motion degrades to instant.

## 2. Onboarding — *the Duolingo principle*
**What Duolingo does well:** low-friction, one-thing-at-a-time, encouraging, and celebratory. Progress is always visible.

**Lephas rules** (applies to "Start a project" + first admin login)
- One decision per step; a slim progress bar with named steps (we have 3 steps already — make the current step feel inevitable).
- Warm, human microcopy: "Nice — what should it do?" beats "Enter requirements."
- Validate gently and inline; never a wall of red.
- A small celebratory moment on submit (a soft check animation + "We've got it 🎉" — our one allowed bit of delight).

## 3. UI design — *the Linear principle*
**What Linear does well:** fast, crisp, keyboard-first, low-chrome. Dense where it should be, calm everywhere else.

**Lephas rules** (admin area)
- Add a command palette (`Cmd/Ctrl-K`) to jump to inquiries, billing, team.
- Tables: tighter row height, clear column hierarchy, sticky headers, hover row highlight.
- Instant feedback — optimistic UI on status changes, crisp focus rings (beige), no layout shift.

## 4. Typography — *the Pentagram principle*
**What Pentagram does well:** confident, editorial type. Strong hierarchy, generous size jumps, type as the main visual.

**Lephas rules**
- Introduce a display face for headings (e.g. a strong grotesque or editorial serif) while body stays a clean sans. Self-host via Fontsource so it works offline and on Vercel.
- A deliberate scale: display 3.5rem / h1 2.5rem / h2 1.75rem / body 1rem / small 0.8125rem, with tight leading on headings (`1.05`).
- Let big headings breathe — they carry the page; shrink supporting text.

## 5. Minimalism — *the Muji principle*
**What Muji does well:** no-noise, functional calm. Nothing decorative that isn't useful.

**Lephas rules**
- Audit every screen: remove borders that a shadow already implies, badges that repeat obvious info, duplicate CTAs.
- One accent (beige) doing one job. Grey does the rest.
- Whitespace is a feature — increase section spacing; let the sage background be empty on purpose.

## 6. Search & filters — *the Airbnb principle*
**What Airbnb does well:** progressive disclosure, visual filter chips, results that update live.

**Lephas rules** (Services + Hire-talent)
- Filter chips (skills, category, availability) as `chip` toggles; active = beige.
- Live-updating result grid, result count ("12 developers"), and an empty-state that suggests broadening.
- Keep advanced filters tucked behind a "Filters" button; show the common ones up front.

## 7. Art & direction — *the Aesop principle*
**What Aesop does well:** editorial restraint, apothecary elegance, generous margins, muted palette, photography-led calm.

**Lephas rules**
- Consistent image treatment: soft, slightly desaturated, warm — matched to the sage/beige world. One treatment, applied everywhere.
- Editorial captions and labels (small-caps `eyebrow`, lots of margin).
- Portfolio and team photos framed identically; never a loud stock photo.

## 8. Dashboards — *the Notion principle*
**What Notion does well:** modular blocks, calm information hierarchy, flexible but tidy.

**Lephas rules** (admin overview, billing)
- Compose the overview from `neu` stat blocks + a recent-activity list + outstanding-balance block — each a self-contained card on a calm grid.
- Numbers big and quiet; labels small. No chart junk — one clear visual per metric.
- Consistent block padding and radius so the grid feels like one system.

## 9. Landing layouts — *the Stripe principle*
**What Stripe does well:** a confident hero, a clear value line, then a clean rhythm of sections; subtle motion and depth; proof near the top.

**Lephas rules** (Home)
- Hero: one strong sentence (we have it), a sub-line, two CTAs, and the logo/visual — with a faint animated gradient/sheen on the glass, not a busy illustration.
- Predictable section rhythm: What we build → How it works → Proof (projects/stats) → Team → CTA. Equal vertical cadence.
- A thin strip of trust signals (projects delivered, developers, response time) high on the page.

## 10. Micro-interactions — *the Framer principle*
**What Framer does well:** every state feels alive — hover, press, focus, load — with spring physics and smooth transitions.

**Lephas rules**
- Buttons: hover lift + slight shadow, press scale `0.98`, beige focus ring.
- Loading: skeleton shimmers on the sage surface (not spinners) for lists/cards.
- Toasts for every action ("Quotation sent ✓") sliding in with `--ease-spring`.
- Links/icons: subtle underline-grow and 150ms color ease.

---

## How we apply this
1. **Foundations first** (one pass): motion tokens (§1), type scale + display font (§4), micro-interaction states (§10). These are global and lift every page at once.
2. **Flagship page**: rebuild Home to the Stripe rhythm (§9) with Aesop restraint (§7).
3. **Flows**: the "Start a project" onboarding (§2) and Services/Talent filters (§6).
4. **Admin**: Notion-style overview (§8) + Linear speed (§3).
5. **Muji pass** (§5): a final subtraction sweep across everything.

**Non-negotiables:** keep the neumorphic glass identity, one beige accent, `prefers-reduced-motion` support, accessibility (focus states, contrast), and performance (self-hosted fonts, no heavy libraries unless they earn it).
