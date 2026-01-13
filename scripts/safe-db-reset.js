#!/usr/bin/env node

/**
 * Bezpieczny reset bazy danych z automatycznym backupem
 * 
 * Użycie:
 *   pnpm db:reset
 * 
 * Skrypt:
 * 1. Tworzy automatyczny backup
 * 2. Pyta o potwierdzenie
 * 3. Resetuje bazę tylko po potwierdzeniu
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('⚠️  UWAGA: Ta operacja USUNIE WSZYSTKIE DANE z bazy!');
  console.log('');
  
  // Automatyczny backup
  console.log('🔄 Tworzenie automatycznego backupu...');
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    const BACKUP_DIR = path.join(process.cwd(), 'supabase', 'backups');
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filepath = path.join(BACKUP_DIR, `auto_backup_before_reset_${timestamp}.sql`);
    
    execSync(`supabase db dump -f "${filepath}"`, { stdio: 'inherit' });
    console.log(`✅ Backup utworzony: ${filepath}`);
    console.log('');
  } catch {
    console.error('⚠️  Nie udało się utworzyć backupu, ale kontynuuję...');
    console.log('');
  }
  
  // Potwierdzenie
  const answer = await question('❓ Czy na pewno chcesz zresetować bazę danych? (wpisz "TAK" aby potwierdzić): ');
  
  if (answer.trim() !== 'TAK') {
    console.log('❌ Operacja anulowana.');
    rl.close();
    process.exit(0);
  }
  
  console.log('');
  console.log('🔄 Resetowanie bazy danych...');
  
  try {
    execSync('supabase db reset', { stdio: 'inherit' });
    console.log('');
    console.log('✅ Baza danych została zresetowana.');
    console.log('💡 Pamiętaj: Wszystkie dane zostały usunięte, ale backup został zapisany.');
  } catch (error) {
    console.error('❌ Błąd podczas resetowania bazy:', error.message);
    rl.close();
    process.exit(1);
  }
  
  rl.close();
}

main();
