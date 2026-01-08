# Go Girl Workout App

![Go Girl Workout App](./public/logo.png)

Private workout planning and logging web app for women who train regularly (especially calisthenics and strength training). The goal is to make it easy to build workout plans from your own exercise library, run guided workout sessions step-by-step, and track personal records (PRs). An optional AI feature (via OpenRouter) is planned to generate/optimize plans based on user preferences.

## Table of contents

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

## 1. Project name

Go Girl Workout App

## 2. Project description

Go Girl is a small-scale web app focused on **functionality and simplicity** rather than deep analytics.

It is designed to help users:

- build workout plans from individual exercises,
- log the actual workout execution (plan vs actual),
- track PRs per exercise derived deterministically from logged sets,
- optionally generate/optimize plans via AI (restricted to the user’s own exercise library).

## 3. Tech stack

- **Frontend**: Next.js (App Router, SSR/SSG/RSC), React, TypeScript
- **Styling/UI**: Tailwind CSS, shadcn/ui (a11y-first components)
- **Backend (planned)**: Supabase (PostgreSQL + Auth + SDK) with Row-Level Security (RLS)
- **AI (planned)**: OpenRouter (single server-side endpoint; model flexibility and cost control)
- **Hosting/CI (planned)**: Vercel for deployments; GitHub Actions for CI (lint/build/tests as needed)
- **Code quality**: ESLint
- **Git hooks**: Husky + lint-staged

## 4. Getting started locally

### Prerequisites

- **Node.js**: `22.19.0` (from `.nvmrc`)
- **Package manager**: `pnpm` (recommended)

### Install dependencies

```bash
pnpm install
```

### Run the app in development

The dev server runs at `http://localhost:3000`.

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Start the production server locally

```bash
pnpm start
```

## 5. Available scripts

- **`pnpm dev`**: start Next.js in development mode
- **`pnpm build`**: create an optimized production build
- **`pnpm start`**: run the production server
- **`pnpm lint`**: run ESLint
- **`pnpm prepare`**: install Husky git hooks

## 6. Project scope

### MVP (in scope)

- **Authentication & data privacy (planned)**: Supabase Auth (e.g. magic link) and per-user data isolation enforced by **RLS**.
- **Exercise library (planned)**: CRUD for exercises, including:
  - fields like title, type, part, and parameters for reps/time/sets/rest,
  - **title uniqueness** per user (case-insensitive, normalized),
  - **deletion blocked** if an exercise is referenced in workout history/PRs.
- **Workout plans as reusable templates (planned)**:
  - CRUD for plans with ordered exercise lists,
  - default “planned\_\*” parameters per exercise.
- **Guided workout session assistant (planned)**:
  - step-by-step flow with `start/pause/next/previous/skip`,
  - autosave on navigation and pause,
  - ability to resume a single `in_progress` session.
- **History & PRs (planned)**:
  - workout session history with planned vs actual and set logs,
  - PRs computed deterministically from saved set logs, with recalculation after edits.
- **AI integration (planned, after core CRUD/session work)**:
  - generate or optimize plans via a server-side endpoint using OpenRouter,
  - **limit: 5 AI actions per user per month**,
  - AI may only use the user’s existing exercises (no new exercise creation in MVP),
  - structured JSON output validated server-side.

### Explicitly out of scope (MVP)

- social/community features and sharing,
- importing workouts from URLs,
- media (images/animations),
- advanced analytics dashboards/KPIs,
- admin panel,
- AI creating new exercises (post-MVP idea).

## 7. Project status

- **Status**: Work in progress / early development
- **Current version**: `0.1.0`

## 8. License

No license file is currently included in this repository. Until a license is added, **all rights are reserved** by default.
