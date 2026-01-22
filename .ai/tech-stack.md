Frontend – Next.js + React:

- Next.js jako framework frontendowy umożliwiający Server-Side Rendering (SSR), Static Site Generation (SSG) oraz React Server Components, co pozwala na budowanie wydajnych aplikacji z kontrolowaną ilością JavaScript po stronie klienta.
- React wykorzystywany do implementacji interaktywnych komponentów UI.
- TypeScript zapewnia statyczne typowanie, większe bezpieczeństwo refaktoryzacji oraz lepsze wsparcie IDE.
- Tailwind CSS umożliwia szybkie i spójne stylowanie oparte o utility-first.
- shadcn/ui dostarcza dostępne (a11y-first) komponenty React, które stanowią bazę systemu UI.

Backend – Supabase

- Supabase pełni rolę Backend-as-a-Service, oparty o PostgreSQL.
- Zapewnia:
  relacyjną bazę danych,
  wbudowaną autentykację użytkowników,
  SDK dla komunikacji z frontendem.
- Row-Level Security (RLS) stosowane do zabezpieczenia danych na poziomie bazy, zapewniając izolację danych użytkowników niezależnie od warstwy aplikacyjnej.
- Rozwiązanie open source z możliwością hostowania lokalnie lub na własnej infrastrukturze.

AI – Integracja przez OpenRouter

- OpenRouter zapewnia jednolity interfejs do komunikacji z wieloma modelami AI (OpenAI, Anthropic, Google i inne).
  Umożliwia:
  elastyczny wybór modeli w zależności od kosztu i jakości,
  kontrolę limitów finansowych na poziomie kluczy API,
  niezależność od jednego dostawcy AI (vendor lock-in mitigation).

CI/CD i Hosting

- GitHub Actions wykorzystywane do automatyzacji procesów CI/CD (lint, testy, build).
- Frontend hostowany na Vercel (hosting “Next.js-first”), zapewniający szybkie deploymenty, preview deployments dla PR oraz wsparcie dla SSR/route handlers w typowym środowisku Next.js.

Security

- RLS
- auth-based access
- brak logiki zaufania po stronie frontendu

Testing

- Vitest – framework testowy dla testów jednostkowych i integracyjnych:
  - Szybki i wydajny (oparty na Vite), zapewnia szybkie uruchamianie testów i hot reload
  - Natywne wsparcie dla ESM, TypeScript i Next.js
  - Kompatybilny API z Jest, co ułatwia migrację i znajomość
  - Doskonała integracja z React Testing Library
  - Wbudowane wsparcie dla raportów pokrycia kodu (coverage)
- Playwright – narzędzie do testów end-to-end:
  - Automatyczne czekanie na elementy (auto-waiting) eliminuje flaky tests
  - Wsparcie dla wielu przeglądarek (Chromium, Firefox, WebKit) z jednej konfiguracji
  - Doskonałe wsparcie dla Next.js (SSR, API routes, App Router)
  - Trace viewer i automatyczne screenshots przy błędach
  - Parallel execution dla szybkiego uruchamiania testów
  - Natywne wsparcie dla TypeScript
  - Codegen do generowania testów poprzez nagrywanie interakcji
- React Testing Library – testy komponentów React z naciskiem na dostępność i user-centric testing
- Kombinacja Vitest + Playwright zapewnia szybkie testy jednostkowe dla szybkiego feedbacku podczas rozwoju oraz solidne testy E2E dla weryfikacji pełnych przepływów użytkownika
