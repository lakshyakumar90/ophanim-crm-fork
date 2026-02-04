import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

async function updateRules() {
  console.log("Updating attendance rules...");
  
  const { data, error } = await supabaseAdmin
    .from("attendance_rules")
    .update({
      work_start_time: "19:00",
      work_end_time: "04:00",
      late_threshold_minutes: 15,
    })
    .eq("id", "1")
    .select();

  if (error) {
    console.error("Failed to update rules:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No rules found, inserting...");
    const { error: insertError } = await supabaseAdmin.from("attendance_rules").insert({
        work_start_time: "19:00",
        work_end_time: "04:00",
        late_threshold_minutes: 15,
    });
    if (insertError) {
        console.error("Failed to insert rules:", insertError);
        process.exit(1);
    }
  }

  console.log("Attendance rules updated successfully:", data);
  process.exit(0);
}

updateRules();
