import { supabase } from '../lib/supabase';

export async function runSimulationCheck() {
  const now = new Date().toISOString();

  // 1. Find ambulances that should be released
  const { data: busyAmbulances } = await supabase
    .from('ambulances')
    .select('id, plate_number')
    .eq('status', 'busy')
    .lt('busy_until', now);

  if (busyAmbulances && busyAmbulances.length > 0) {
    for (const amb of busyAmbulances) {
      // Find the confirmed assignment for this ambulance
      const { data: assignment } = await supabase
        .from('assignments')
        .select('*, incidents:accident_id(*), hospital:hospital_id(*)')
        .eq('ambulance_id', amb.id)
        .eq('status', 'confirmed')
        .single();

      if (assignment) {
        // Release hospital beds
        const { data: hospital } = await supabase
          .from('hospitals')
          .select('available_beds')
          .eq('id', assignment.hospital_id)
          .single();

        if (hospital && assignment.incidents) {
          const newBeds = hospital.available_beds + assignment.incidents.patient_count;
          await supabase.from('hospitals')
            .update({ available_beds: newBeds })
            .eq('id', assignment.hospital_id);
        }

        // Close assignment and accident
        await supabase.from('assignments').update({ status: 'completed' }).eq('id', assignment.id);
        await supabase.from('accidents').update({ status: 'resolved' }).eq('id', assignment.accident_id);
      }

      // Finally, set ambulance to available
      await supabase.from('ambulances').update({ status: 'available', busy_until: null }).eq('id', amb.id);
    }
    console.log(`[SIM] Released ${busyAmbulances.length} ambulances and associated resources.`);
  }
}

export function startSimulationEngine(intervalMs = 60000) {
  const timer = setInterval(() => {
    runSimulationCheck();
  }, intervalMs);
  // Initial check
  runSimulationCheck();
  return () => clearInterval(timer);
}
