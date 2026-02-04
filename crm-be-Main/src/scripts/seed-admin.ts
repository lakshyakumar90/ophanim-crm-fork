#!/usr/bin/env npx tsx
/**
 * Admin User Seed Script
 *
 * Usage: npx tsx src/scripts/seed-admin.ts --email admin@example.com --password YourPassword123! --name "Admin User"
 *
 * This script creates the initial admin user for the CRM system.
 * Run this once after setting up your database.
 */

import { parseArgs } from "util";
import { supabaseAdmin } from "../config/supabase.js";
import { hashPassword } from "../utils/helpers.js";
import { logger } from "../utils/logger.js";

interface AdminInput {
  email: string;
  password: string;
  name: string;
}

async function parseArguments(): Promise<AdminInput> {
  try {
    const { values } = parseArgs({
      options: {
        email: { type: "string", short: "e" },
        password: { type: "string", short: "p" },
        name: { type: "string", short: "n" },
      },
    });

    if (!values.email || !values.password || !values.name) {
      console.error("❌ Missing required arguments");
      console.log("\nUsage:");
      console.log(
        "  npx tsx src/scripts/seed-admin.ts --email <email> --password <password> --name <name>"
      );
      console.log("\nExample:");
      console.log(
        '  npx tsx src/scripts/seed-admin.ts --email admin@example.com --password Admin123! --name "Super Admin"'
      );
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(values.email)) {
      console.error("❌ Invalid email format");
      process.exit(1);
    }

    // Validate password strength
    if (values.password.length < 8) {
      console.error("❌ Password must be at least 8 characters");
      process.exit(1);
    }

    return {
      email: values.email.toLowerCase(),
      password: values.password,
      name: values.name,
    };
  } catch (error) {
    console.error("❌ Failed to parse arguments:", error);
    process.exit(1);
  }
}

async function seedAdmin(input: AdminInput): Promise<void> {
  console.log("\n🔧 Creating admin user...\n");

  // Check if email already exists
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", input.email)
    .single();

  if (existingUser) {
    console.log(`⚠️  User with email ${input.email} already exists.`);
    console.log(`   User ID: ${existingUser.id}`);
    console.log(
      "\n💡 If you need to update this user, use the admin panel or database directly."
    );
    process.exit(0);
  }

  // Create user in Supabase Auth
  console.log("📝 Creating auth user...");
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

  if (authError) {
    console.error("❌ Failed to create auth user:", authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`   ✓ Auth user created (ID: ${userId})`);

  // Create user record in users table
  console.log("📝 Creating user profile...");
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: userId,
      email: input.email,
      full_name: input.name,
      role: "admin",
      is_active: true,
    })
    .select()
    .single();

  if (userError) {
    // Rollback auth user
    console.log("   ⚠️  Rolling back auth user...");
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.error("❌ Failed to create user profile:", userError.message);
    process.exit(1);
  }

  console.log(`   ✓ User profile created`);

  // Success summary
  console.log("\n" + "═".repeat(50));
  console.log("✅ ADMIN USER CREATED SUCCESSFULLY!");
  console.log("═".repeat(50));
  console.log(`\n📧 Email:    ${input.email}`);
  console.log(`👤 Name:     ${input.name}`);
  console.log(`🔑 Role:     admin`);
  console.log(`🆔 User ID:  ${userId}`);
  console.log("\n🔐 Password: [the password you provided]");
  console.log("\n💡 You can now login at your CRM frontend.");
  console.log("═".repeat(50) + "\n");
}

async function main(): Promise<void> {
  try {
    const input = await parseArguments();
    await seedAdmin(input);
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Failed to seed admin user");
    console.error("\n❌ An unexpected error occurred:", error);
    process.exit(1);
  }
}

main();
