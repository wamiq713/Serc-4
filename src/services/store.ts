import { create } from 'zustand';

interface EmergencyState {
  accidents: any[];
  ambulances: any[];
  hospitals: any[];
  setAccidents: (accidents: any[]) => void;
  setAmbulances: (ambulances: any[]) => void;
  setHospitals: (hospitals: any[]) => void;
}

export const useEmergencyStore = create<EmergencyState>((set) => ({
  accidents: [],
  ambulances: [],
  hospitals: [],
  setAccidents: (accidents) => set({ accidents }),
  setAmbulances: (ambulances) => set({ ambulances }),
  setHospitals: (hospitals) => set({ hospitals }),
}));
