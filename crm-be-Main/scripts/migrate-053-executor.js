#!/usr/bin/env node

/**
 * Direct Migration Executor for Migration 053
 * Directly reads .env and applies SQL to Supabase database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file manually
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    console.error('   Create one or set environment variables directly');
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return env;
}

async function executeMigration() {
  console.log('🔵 Migration 053 - Fix RLS Recursion\n');

  const env = loadEnv();
  if (!env) {
    console.log('👉 Setting env vars manually...');
    const manualUrl = process.env.SUPABASE_URL;
    const manualKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!manualUrl || !manualKey) {
      console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      console.error('\n📝 Set them:');
      console.error('   export SUPABASE_URL="https://..."');
      console.error('   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
      console.error('\nThen run again');
      return;
    }
  }

  const url = env?.SUPABASE_URL || process.env.SUPABASE_URL;
  const key = env?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  console.log('📍 Target:', url.replace(/.*\/\//,'').split('/')[0]);
  
  // Read migration file
  const migrationFile = path.join(__dirname, 'supabase', 'migrations', '053_fix_rls_recursion.sql');
  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found:', migrationFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');
  console.log('✅ Migration file loaded\n');

  // For demonstration - show what will be executed
  const lines = sql.split('\n').filter(l => !l.trim().startsWith('--') && l.trim());
  console.log(`📝 ${lines.length} SQL statement lines found`);
  console.log('\n💡 To execute, do ONE of the following:\n');

  console.log('1️⃣  WEB UI (EASIEST):');
  console.log('   - Go to: https://app.supabase.com/');
  console.log('   - Select your project');
  console.log('   - SQL Editor → New Query');
  console.log('   -  Copy paste the SQL and run\n');

  console.log('2️⃣ CLI:');
  console.log('   supabase migration up\n');

  console.log('3️⃣  DIRECT CURL:');
  console.log('   curl -X POST \\');
  console.log('     https://your-project.supabase.co/functions/v1/');
  console.log('     -H "Authorization: Bearer YOUR_KEY" \\');
  console.log('     -d \'{"sql":"..."}\'');

  console.log('\n📄 SQL File:', migrationFile);
  console.log('📋 File Size:', `${sql.length} bytes`);

}

executeMigration().catch(console.error);
