#!/usr/bin/env node

/**
 * Skrypt weryfikujący konfigurację Supabase w projekcie Next.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
/* eslint-enable @typescript-eslint/no-require-imports */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function checkmark(message) {
  console.log(`${colors.green}✅${colors.reset} ${message}`);
}

function cross(message) {
  console.log(`${colors.red}❌${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ️${colors.reset} ${message}`);
}

function header(message) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

const projectRoot = path.resolve(__dirname, '..');
let hasErrors = false;
let hasWarnings = false;

header('Weryfikacja konfiguracji Supabase');

// 1. Sprawdź plik .env.local
const envLocalPath = path.join(projectRoot, '.env.local');

if (fs.existsSync(envLocalPath)) {
  checkmark('Plik .env.local istnieje');
  
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
  const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
  
  if (hasUrl && hasKey) {
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    
    const url = urlMatch ? urlMatch[1].trim() : '';
    const key = keyMatch ? keyMatch[1].trim() : '';
    
    if (url && url !== '' && !url.startsWith('#')) {
      if (url.startsWith('https://') && url.includes('.supabase.co')) {
        checkmark(`NEXT_PUBLIC_SUPABASE_URL jest ustawione: ${url.substring(0, 30)}...`);
      } else {
        cross(`NEXT_PUBLIC_SUPABASE_URL ma nieprawidłowy format: ${url}`);
        hasErrors = true;
      }
    } else {
      cross('NEXT_PUBLIC_SUPABASE_URL jest puste lub zakomentowane');
      hasErrors = true;
    }
    
    if (key && key !== '' && !key.startsWith('#')) {
      if (key.length > 50) {
        checkmark('NEXT_PUBLIC_SUPABASE_ANON_KEY jest ustawione (długość OK)');
      } else {
        warning('NEXT_PUBLIC_SUPABASE_ANON_KEY wydaje się być za krótkie');
        hasWarnings = true;
      }
    } else {
      cross('NEXT_PUBLIC_SUPABASE_ANON_KEY jest puste lub zakomentowane');
      hasErrors = true;
    }
  } else {
    cross('Brak wymaganych zmiennych środowiskowych w .env.local');
    hasErrors = true;
  }
} else {
  cross('Plik .env.local nie istnieje');
  info('Utwórz plik .env.local na podstawie .env.example');
  hasErrors = true;
}

// 2. Sprawdź package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (deps['@supabase/supabase-js']) {
    checkmark(`@supabase/supabase-js zainstalowane (v${deps['@supabase/supabase-js']})`);
  } else {
    cross('@supabase/supabase-js nie jest zainstalowane');
    hasErrors = true;
  }
  
  if (deps['@supabase/ssr']) {
    checkmark(`@supabase/ssr zainstalowane (v${deps['@supabase/ssr']})`);
  } else {
    warning('@supabase/ssr nie jest zainstalowane (zalecane dla Next.js 16 App Router)');
    hasWarnings = true;
  }
  
  if (deps['supabase']) {
    checkmark(`supabase CLI zainstalowane (v${deps['supabase']})`);
  } else {
    info('supabase CLI nie jest zainstalowane (opcjonalne, przydatne do migracji)');
  }
}

// 3. Sprawdź strukturę klienta Supabase
const clientPath = path.join(projectRoot, 'src/db/src/db/supabase.client.ts');
if (fs.existsSync(clientPath)) {
  checkmark('Plik supabase.client.ts istnieje');
  
  const clientContent = fs.readFileSync(clientPath, 'utf-8');
  
  if (clientContent.includes('createBrowserClient') || clientContent.includes('createClient')) {
    if (clientContent.includes('createBrowserClient')) {
      checkmark('Klient używa createBrowserClient (poprawne dla client components)');
    } else {
      checkmark('Klient używa createClient');
    }
  } else {
    cross('Klient nie używa createClient ani createBrowserClient');
    hasErrors = true;
  }
  
  if (clientContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    checkmark('Klient używa NEXT_PUBLIC_SUPABASE_URL');
  } else {
    cross('Klient nie używa NEXT_PUBLIC_SUPABASE_URL');
    hasErrors = true;
  }
  
  if (clientContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    checkmark('Klient używa NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else {
    cross('Klient nie używa NEXT_PUBLIC_SUPABASE_ANON_KEY');
    hasErrors = true;
  }
  
  // Sprawdź czy używa @supabase/ssr
  if (clientContent.includes('@supabase/ssr')) {
    if (clientContent.includes('createBrowserClient')) {
      checkmark('Klient używa @supabase/ssr z createBrowserClient (poprawne dla client components)');
    } else if (clientContent.includes('createServerClient')) {
      checkmark('Klient używa @supabase/ssr z createServerClient (poprawne dla server components)');
    } else {
      checkmark('Klient używa @supabase/ssr');
    }
  } else {
    warning('Klient nie używa @supabase/ssr (zalecane dla Next.js 16 App Router)');
    hasWarnings = true;
  }
} else {
  cross('Plik supabase.client.ts nie istnieje');
  hasErrors = true;
}

// 4. Sprawdź czy istnieje osobny klient dla server components
const serverClientPath = path.join(projectRoot, 'src/db/src/db/supabase.server.ts');
if (fs.existsSync(serverClientPath)) {
  checkmark('Osobny klient dla server components istnieje (supabase.server.ts)');
} else {
  warning('Brak osobnego klienta dla server components (zalecane dla Next.js 16)');
  hasWarnings = true;
}

// 5. Sprawdź migracje Supabase
const migrationsPath = path.join(projectRoot, 'supabase/migrations');
if (fs.existsSync(migrationsPath)) {
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
  if (migrations.length > 0) {
    checkmark(`Znaleziono ${migrations.length} migracji Supabase`);
  } else {
    warning('Brak migracji w katalogu supabase/migrations');
    hasWarnings = true;
  }
} else {
  warning('Katalog supabase/migrations nie istnieje');
  hasWarnings = true;
}

// Podsumowanie
header('Podsumowanie');

if (hasErrors) {
  cross('Znaleziono błędy w konfiguracji. Napraw je przed kontynuowaniem.');
  process.exit(1);
} else if (hasWarnings) {
  warning('Konfiguracja działa, ale są zalecane ulepszenia.');
  info('Sprawdź ostrzeżenia powyżej i rozważ ich wdrożenie.');
  process.exit(0);
} else {
  checkmark('Konfiguracja Supabase wygląda poprawnie!');
  process.exit(0);
}
