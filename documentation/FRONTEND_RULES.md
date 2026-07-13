# Frontend Development Rules

## 1. Latest Libraries

- Latest stable library versions use korun existing stack er sathe compatible thakle.
- `package.json` er dependency versions check kore update korun regularly.
- Next.js 16, React 19, TypeScript 5, TailwindCSS 4 — ei stack e kaj korun.

## 2. No Duplicate Libraries

- Eki type er kaj er jonno duplicate library add korben na.
  - Animation er jonno shudhu CSS/Tailwind use korun, alada animation library add korben na unless complex animation dorkar hoy.
  - HTTP client er jonno built-in `fetch` i use korun (`apiFetch.ts` wrapper already ase), axios add korben na.
  - Form validation er jonno ekta library (e.g., Zod + React Hook Form) use korun.
- Before adding any new package, check `package.json` for existing alternatives.

## 3. Consistent Spacing & Sizing

- Height, Width, Padding always existing component er dekhe decide korun.
- Tailwind spacing scale follow korun (e.g., `p-4`, `gap-6`, `max-w-7xl`).
- Kobhu arbitrary pixel values (`w-[237px]`) use korben na unless absolutely necessary.
- Content alignment jeno proper and professional hoy — center/left/right consistent thakbe.
- Container max-width consistent rakun across pages: `max-w-7xl` or `max-w-6xl`.

## 4. Smooth Animations

- Animation thakle smooth hote hobe. CSS `transition` / `transform` prefer korun.
- Heavy JS animation libraries (GSAP, Framer Motion) add korben na unless absolutely necessary.
- `transition: all 0.3s ease` er bodole specific property transition use korun:
  ```css
  transition: background-color 0.3s ease, transform 0.2s ease;
  ```
- `prefers-reduced-motion` media query respect korun accessibility er jonno.

## 5. Skeleton Loading

- **API data load hoa porjonto skeleton effect show korbe.** Blank/broken layout kobhu dekhaben na.
- Next.js `loading.tsx` use korun route-level skeleton er jonno.
- Component-level `isLoading` state er jonno custom skeleton component banate parun.
- Skeleton color brand color er lighter shade use korun.

## 6. Responsive Design

- Design always responsive hobe — **mobile first** approach.
- Tailwind breakpoints use korun: `sm:`, `md:`, `lg:`, `xl:`
- Mobile er jonno touch targets minimum 44x44px hote hobe.
- Desktop er jonno proper max-width container use korun.
- Font size responsive hobe — `text-sm` mobile e, `text-base` desktop e.
- Image/container ratio mobile vs desktop e alada hote parbe — aspect ratio breakpoints use korun.

## 7. Optimized Loading

- Page load and API calls optimized hote hobe.
- Images er jonno `next/image` use korun (automatic optimization, lazy loading).
- Heavy components `next/dynamic` diye lazy load korun.
- API responses cache korun where appropriate (TanStack Query / SWR recommend kora hoy).
- `React.memo()` use korun jodi component unnecessary re-render hoy.
- Kobhu `useEffect` e API call korben na — data fetching library use korun.

## 8. Brand Colors

- Colors **always** logo er sathe match korbe:
  - **Deep Navy Blue:** `#0a1628`
  - **Red:** `#e63946`
- CSS variables (`globals.css`) er jonno ei colors sync korun:
  ```css
  --primary-color: #0a1628;
  --secondary-color: #e63946;
  ```
- Kobhu random colors use korben na — brand palette maintain korun.

## 9. Component Reusability

- Common UI elements (buttons, cards, inputs, modals) reusable component banan.
- Admin panel er jonno consistent design system maintain korun.
- Kobhu inline styles (`style={{...}}`) use korben na unless dynamic value dorkar hoy.
- Props interface properly define korun TypeScript diye.
- Component folder structure maintain korun:
  ```
  components/
  ├── ui/           # Reusable UI primitives (Button, Card, Modal)
  ├── forms/        # Form-specific components
  └── shared/       # Cross-page shared components
  ```

## 10. Code Quality

- TypeScript types properly define korun. `any` type avoid korun.
- Function names descriptive hote hobe (e.g., `handleSubmitForm`, not `handleClick`).
- Error handling proper korun — `try/catch` async operations e.
- Custom hooks banan repeated logic er jonno (`useAuth`, `useFetch`, etc.).
- Accessibility (a11y) maintain korun — `alt` text, `aria-label`, keyboard navigation.

## 11. Git & Deployment

- Meaningful commit messages likhun.
- Feature branch e kaaj korun, direct `main` e push korben na.
- `npm run build` successful hote hobe before pushing — TypeScript errors fix korun.
- `.env.local` git e push korben na.
