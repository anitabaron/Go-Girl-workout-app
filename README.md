## Welcome to Go Girl Workout App!

![Go Girl! Workout App](./public/logo.png)

A simple and effective tool to help you **plan**, **track**, and **stay consistent** with your workouts. Designed for individual users, the app supports easy customization of workout routines (reps, sets, and timed intervals).

## Planned features

- **Customizable workout plans**: Create a personalized training plan tailored to your goals.
- **Adjustable repetitions & sets**: Modify exercises as you progress.
- **Built-in time counter**: Automatic timer for exercises and breaks.
- **User-friendly interface**: Open the app and get moving.
- **Responsive design**: Works on desktop, tablet, and mobile.

## Roadmap

- **Phase 1**: Basic workout creation & tracking
- **Phase 2**: Progress tracking & analytics, AI assistant

## Tech stack

- **Frontend**: Next.js + React (SSR/SSG + React Server Components), TypeScript
- **UI**: Tailwind CSS, shadcn/ui (a11y-first components)
- **Backend**: Supabase (PostgreSQL + Auth + SDK), Row-Level Security (RLS)
- **AI**: OpenRouter integration (model flexibility + cost control)
- **CI/CD & Hosting**: GitHub Actions, Vercel
- **Security**: Auth-based access + RLS (no trust in frontend logic)

## Getting started

### Install dependencies

```bash
pnpm install
```

### Run the app (dev)

Runs on `http://localhost:3000`.

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Preview production build

```bash
pnpm start
```
