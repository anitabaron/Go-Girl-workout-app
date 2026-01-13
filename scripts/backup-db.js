#!/usr/bin/env node

/**
 * Skrypt do tworzenia backupu bazy danych Supabase
 * 
 * Użycie:
 *   pnpm backup:db
 *   pnpm backup:db --data-only
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(process.cwd(), 'supabase', 'backups');

// Tworzenie katalogu backupów jeśli nie istnieje
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const dataOnly = process.argv.includes('--data-only');
const filename = dataOnly 
  ? `backup_data_${timestamp}.sql`
  : `backup_full_${timestamp}.sql`;
const filepath = path.join(BACKUP_DIR, filename);

console.log('🔄 Tworzenie backupu bazy danych...');
console.log(`📁 Lokalizacja: ${filepath}`);

try {
  const command = dataOnly
    ? `supabase db dump --data-only -f "${filepath}"`
    : `supabase db dump -f "${filepath}"`;
  
  execSync(command, { stdio: 'inherit' });
  
  const stats = fs.statSync(filepath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log('✅ Backup utworzony pomyślnie!');
  console.log(`📊 Rozmiar: ${sizeMB} MB`);
  console.log(`💾 Plik: ${filepath}`);
  
  // Usuwanie starych backupów (zachowaj ostatnie 10)
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  if (backups.length > 10) {
    const toDelete = backups.slice(10);
    console.log(`\n🗑️  Usuwanie starych backupów (zachowano ostatnie 10)...`);
    toDelete.forEach(backup => {
      fs.unlinkSync(backup.path);
      console.log(`   Usunięto: ${backup.name}`);
    });
  }
  
} catch (error) {
  console.error('❌ Błąd podczas tworzenia backupu:', error.message);
  process.exit(1);
}
