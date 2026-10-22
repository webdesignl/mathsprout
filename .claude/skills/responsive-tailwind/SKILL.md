---
name: "responsive-tailwind"
description: "Use when building or fixing any web page or UI with Tailwind CSS so it adapts cleanly to mobile, tablet and desktop, mobile-first and without hover-only interactions."
---

# Responsive pages with Tailwind CSS

Every page or component built under this skill must work well on phones, tablets and desktops. Use Tailwind CSS for all styling unless the user says otherwise.

## 1. Breakpoints

Build mobile-first: unprefixed classes are the phone layout, and prefixes only add changes for larger screens.

| Device  | Width          | Tailwind prefix          |
|---------|----------------|--------------------------|
| Phone   | under 640px    | none (base classes)      |
| Tablet  | 640px–1024px   | `sm:` (and `md:` if needed) |
| Desktop | above 1024px   | `lg:` (and `xl:` for wide)  |

Example: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.

Never write desktop styles first and then undo them with `max-*` variants, unless fixing an existing page where that is the smallest safe change.

## 2. Fluid type and spacing

Use `clamp()` so sizes scale smoothly between breakpoints instead of jumping.

- Headings: `text-[clamp(1.75rem,4vw+1rem,3.5rem)]`
- Body text stays readable: never below 16px on mobile (`text-base`).
- Section spacing: `py-[clamp(2rem,6vw,6rem)]`, `gap-[clamp(1rem,3vw,2rem)]`
- If the same clamp values repeat, define them once as theme tokens (Tailwind v4 `@theme`, or `theme.extend` in a v3 config) and use the named class.

## 3. Layout: Grid and Flexbox, no fixed widths

- Use `grid` and `flex` for layout; let content wrap (`flex-wrap`).
- Use `w-full`, `max-w-*` and `mx-auto` for containers, never fixed pixel widths like `w-[960px]`.
- Images and media: `max-w-full h-auto`, or `aspect-*` with `object-cover`.
- Use `min-w-0` on flex/grid children that hold long text so they can shrink.
- Tables on small screens: wrap in `overflow-x-auto` inside their own container, or restack rows as cards.

## 4. Touch targets

- Every tappable element (buttons, links in nav, icons, form controls) is at least 44×44px: e.g. `min-h-11 min-w-11` plus padding.
- Keep at least 8px (`gap-2`) between adjacent tap targets.
- Form inputs use `text-base` or larger so mobile browsers don't zoom in on focus.

## 5. No horizontal scrolling

- The page must never scroll sideways at any width from 320px up.
- Watch for: fixed widths, long unbroken strings or URLs (`break-words`), wide tables, negative margins, `100vw` elements (use `w-full` instead).

## 6. Navigation

- On phones (and tablets if the links don't fit), collapse the nav into a menu button (hamburger) that opens a panel or drawer: e.g. `lg:hidden` on the button, `hidden lg:flex` on the desktop link row.
- The menu button has an accessible label (`aria-label`, `aria-expanded`, `aria-controls`), and the menu closes on link tap and on Escape.
- Menu links inside the panel are full-width, 44px+ tall tap targets.

## 7. Hover states: avoid them

Phones and tablets have no hover, so nothing may depend on it.

- Do not hide content, actions or menus behind hover (no hover-only dropdowns, hover-reveal buttons, hover-only tooltips, or hover-to-preview cards).
- Purely decorative hover feedback (a color change on a button) is allowed only as a desktop enhancement and must never be the only way to see or reach something. In Tailwind v4, `hover:` already applies only on devices that can hover; in v3, guard it with `[@media(hover:hover)]:hover:` or `lg:hover:`.
- Always provide visible `focus-visible:` styles for keyboard users.

**If the request or an existing design relies on hover** (for example a mega-menu that opens on hover, or cards that reveal details on hover), stop before building that part and ask the user which alternate design they want for tablet and mobile. Offer concrete options, such as:
  1. Tap to toggle (tap opens, tap again or tap outside closes)
  2. Always visible on touch screens (show the hidden content by default below the desktop breakpoint)
  3. Move it into a separate view (accordion, bottom sheet, or a detail page)
Then build the chosen option for mobile/tablet and keep the hover version only for desktop if they want it. If the user is not available to answer, use option 1 and say so.

## 8. Check every width before calling it done

Before saying the page is finished:

1. View it at these widths: **375px** (phone), **768px** (tablet), **1024px** (tablet/desktop edge), **1280px** (desktop). Also check **320px** for the smallest phones.
   - If a browser tool is available, resize the window to each width and take a screenshot.
   - Otherwise, review the markup for each breakpoint carefully.
2. At every width confirm:
   - no horizontal scroll (`document.documentElement.scrollWidth <= window.innerWidth`)
   - text is readable and nothing overlaps or is cut off
   - nav works (menu opens/closes on small screens, full links on desktop)
   - tap targets are 44px+ on phone and tablet
   - nothing important depends on hover
3. Fix anything that fails, then re-check that width.
4. In the final reply, briefly state which widths were checked and anything the user should know (for example, a hover alternative that was chosen).