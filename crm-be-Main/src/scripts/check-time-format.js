
import { createClient } from '@supabase/supabase-js';

// Values from .env inspection
const supabaseUrl = 'https://yaghngtqivvbsnswobot.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZ2huZ3RxaXZ2YnNuc3dvYm90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0NjM0MCwiZXhwIjoyMDgzNTIyMzQwfQ.W7a1tD2gG40qVB_qhLog6UfRSa-70YcjbgZffMgsNxM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRawTime() {
  console.log("Fetching latest attendance record...");
  const { data, error } = await supabase
    .from('attendance')
    .select('created_at, clock_in_time, clock_out_time, date')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data && data.length > 0) {
    const record = data[0];
    console.log("RAW RECORD (JSON):", JSON.stringify(record, null, 2));
    
    // Check Clock In
    if (record.clock_in_time) {
        console.log("clock_in_time (Raw):", record.clock_in_time);
        
        // Check if it ends in Z
        const isZ = record.clock_in_time.endsWith('Z');
        console.log("Ends with Z (UTC)?", isZ);

        const dateObj = new Date(record.clock_in_time);
        console.log("JS Date ISO:", dateObj.toISOString());
    } else {
        console.log("clock_in_time is null");
    }

    if (record.clock_out_time) {
         console.log("clock_out_time (Raw):", record.clock_out_time);
    }

  } else {
    console.log("No attendance records found.");
  }
}

checkRawTime();
