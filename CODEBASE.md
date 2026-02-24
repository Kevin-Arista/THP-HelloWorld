# Codebase Navigation Guide

This document explains the structure of the MemeVote project — what each directory and file is responsible for and how they relate to each other.

---

## Top-level overview

```
hello-world/
├── app/                  # All Next.js pages, layouts, and components
├── lib/                  # Shared utility modules (Supabase clients)
├── public/               # Static assets served at /
├── middleware.ts          # Route-level auth guard (runs before every request)
├── next.config.ts         # Next.js configuration
├── .env.local             # Environment variables (Supabase URL + anon key) — not committed
└── tsconfig.json          # TypeScript configuration
```

---

## `app/` — Pages and UI

This project uses the Next.js App Router. Every folder inside `app/` that contains a `page.tsx` becomes a URL route.

```
app/
├── layout.tsx             # Root layout — wraps every page with <Navbar /> and global styles
├── globals.css            # Global CSS reset and base styles
├── page.module.css        # CSS module used by the home page
├── page.tsx               # Home page  →  route: /
├── favicon.ico            # Browser tab icon
│
├── login/
│   └── page.tsx           # Login page  →  route: /login
│                          # Renders the "Sign in with Google" button
│                          # Navbar is hidden on this route
│
├── showcase/
│   └── page.tsx           # Showcase page  →  route: /showcase
│                          # Fetches and displays all public meme screenshots
│                          # from the Supabase `screenshots` table (joined with
│                          # `captions` and `images`)
│
├── vote/
│   └── page.tsx           # Vote page  →  route: /vote
│                          # Card-swipe interface for upvoting/downvoting captions
│                          # Filters out captions the signed-in user already voted on
│                          # Supports keyboard shortcuts: ← reject, → approve
│
├── auth/
│   └── callback/
│       └── route.ts       # OAuth callback handler  →  route: /auth/callback
│                          # Exchanges the OAuth code for a Supabase session,
│                          # then redirects to / on success or /login?error=... on failure
│
└── components/
    └── Navbar.tsx          # Shared navigation bar rendered on every page except /login
                           # Shows links to Showcase and Vote; shows Sign In or Sign Out
                           # depending on auth state
```

### How pages connect

```
/  (home)
├── → /vote       (Start Voting button)
└── → /showcase   (View Showcase button)

/login
└── → /auth/callback   (Google OAuth redirect)
    └── → /            (on success)
        → /login?error (on failure)

Navbar (present on /, /showcase, /vote)
├── MemeVote logo → /
├── Showcase link → /showcase
├── Vote link     → /vote
└── Sign In       → /login  (when unauthenticated)
    Sign Out      → /login  (when authenticated)
```

---

## `lib/` — Supabase clients

```
lib/
└── supabase/
    ├── client.ts   # Browser-side Supabase client (used in "use client" components)
    │               # Created with createBrowserClient from @supabase/ssr
    │
    └── server.ts   # Server-side Supabase client (used in Server Components and route handlers)
                    # Created with createServerClient; reads/writes cookies via next/headers
```

**Rule of thumb:** if a file has `"use client"` at the top, import from `lib/supabase/client.ts`. If it's a Server Component or an API route handler, import from `lib/supabase/server.ts`.

---

## `middleware.ts` — Auth guard

Runs on every incoming request (except static files and images). If the user is not authenticated and is trying to reach any route other than `/`, `/login`, or `/auth/*`, they are redirected to `/login`.

Routes that are **publicly accessible** without login:
- `/` — home page
- `/login` — sign-in page
- `/auth/callback` — OAuth callback

Routes that **require authentication**:
- `/showcase`
- `/vote`

---

## `public/` — Static assets

Static files served directly at the root URL. Currently contains only the default Next.js SVG icons (unused by the app UI). New images or icons added here are accessible at `/filename`.

---

## Database tables (Supabase)

The app reads from three joined tables:

| Table | Purpose |
|---|---|
| `images` | Source images; has `url`, `image_description`, and `is_public` flag |
| `captions` | AI-generated captions linked to an image; has `content` and `like_count` |
| `screenshots` | Records of a caption being featured; links a `caption_id` to a `profile_id` |
| `caption_votes` | Stores each user's vote (`vote_value`: `1` or `-1`) per caption |

Only rows where `images.is_public = true` are shown in the UI.
