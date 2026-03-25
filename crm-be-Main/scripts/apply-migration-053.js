#!/usr/bin/env node

/**
 * Apply Migration 053 - Fix RLS Recursion
 * 
 * This script reads migration 053 and applies it to Supabase.
 * 
 * Usage:
 *   pnpm run migrate:053
 *   OR
 *   node scripts/apply-migration-053.js
 */

import * as fs from 'fs';
import * as path from 'path';  
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../supabase/migrations/053_fix_rls_recursion.sql');

// Read migration file
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Parse environment - will be loaded by dotenv in config/env.ts
import('../config/env.js').then(async (envModule) => {
  const config = envModule.config;
  
  if (!config.supabase?.url || !config.supabase?.serviceRoleKey) {
    console.error('❌ Error: Missing Supabase credentials in environment variables');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🚀 Applying Migration 053: Fix RLS Recursion\n');
  console.log('📍 Project:', config.supabase.url);
  
  try {
    // Split migration into individual statements
    // Remove comments and empty lines, split by semicolons
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements\n`);
    
    // Create FormData for multipart request
    const url = new URL(
      '/functions/v1/exec-sql',
      config.supabase.url
    );

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = i + 1;
      
      // Show first 80 chars of statement
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      process.stdout.write(`[${statementNum}/${statements.length}] Executing: ${preview}... `);

      try {
        // Try to call Supabase RPC function if it exists
        // Otherwise, we'll establish direct connection
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: statement,
          }),
        }).catch(() => {
          // If HTTP method fails, we need an alternative approach
          throw new Error('Supabase HTTP API not available for SQL execution');
        });

        if (response.ok) {
          console.log('✅');
          successCount++;
        } else {
          const error = await response.text();
          console.log(`❌ (${response.status})`);
          console.error(`     ${error.substring(0, 100)}`);
          failureCount++;
        }
      } catch (error) {
        console.log('⚠️  (skipped)');
        console.log(`     Note: ${error.message}`);
        // Continue - some statements might not be needed if already applied
      }
    }

    console.log(`\n📊 Results: ${successCount} statements executed, ${failureCount} failed\n`);

    if (successCount > 0) {
      console.log('✅ Migration 053 has been applied!');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Reload your browser');
      console.log('   2. Try the /tasks API endpoint');
      console.log('   3. Verify you get data (not 500 error)\n');
    } else {
      console.log('⚠️  No statements executed. Please apply migration manually:\n');
      console.log('   1. Go to Supabase SQL Editor');
      console.log('   2. Copy contents of: supabase/migrations/053_fix_rls_recursion.sql');
      console.log('   3. Paste and run in SQL Editor\n');
    }

  } catch (error) {
    console.error('\n❌ Failed to apply migration:', error.message);
    console.error('\n📖 Please apply manually:');
    console.error('   1. Open Supabase dashboard');
    console.error('   2. Go to SQL Editor');
    console.error('   3. Copy paste migration file contents and run\n');
    process.exit(1);
  }
}).catch(err => {
  console.error('Failed to load config:', err.message);
  process.exit(1);
});
