-- SQL Schema for Smart Emergency Response System (Refined)

-- Profiles Table (Linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'dispatcher')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hospitals Table
CREATE TABLE hospitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  total_beds INTEGER DEFAULT 0,
  icu_beds INTEGER DEFAULT 0,
  available_beds INTEGER DEFAULT 0,
  emergency_support BOOLEAN DEFAULT TRUE,
  contact_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ambulances Table
CREATE TABLE ambulances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_number TEXT UNIQUE NOT NULL,
  driver_name TEXT,
  contact_number TEXT,
  capacity INTEGER DEFAULT 1,
  type TEXT DEFAULT 'Basic', -- Basic, Advanced
  status TEXT CHECK (status IN ('available', 'busy', 'maintenance')) DEFAULT 'available',
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  busy_until TIMESTAMP WITH TIME ZONE -- For simulation
);

-- Accidents Table
CREATE TABLE accidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_by UUID REFERENCES profiles(id),
  description TEXT,
  severity TEXT CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  patient_count INTEGER DEFAULT 1,
  emergency_level INTEGER DEFAULT 1, -- 1 to 5
  status TEXT CHECK (status IN ('reported', 'dispatching', 'active', 'resolved')) DEFAULT 'reported',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Assignments
CREATE TABLE assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accident_id UUID REFERENCES accidents(id) ON DELETE CASCADE,
  ambulance_id UUID REFERENCES ambulances(id),
  hospital_id UUID REFERENCES hospitals(id),
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed
  estimated_arrival_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE -- For simulation bed/ambulance release
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE accidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo, but secure for users)
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can do everything on hospitals" ON hospitals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public read hospitals" ON hospitals FOR SELECT USING (true);

CREATE POLICY "Admin can do everything on ambulances" ON ambulances FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public read ambulances" ON ambulances FOR SELECT USING (true);

CREATE POLICY "Dispatchers can report accidents" ON accidents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'dispatcher')
);
CREATE POLICY "Public read accidents" ON accidents FOR SELECT USING (true);
CREATE POLICY "Update accidents" ON accidents FOR UPDATE USING (true);
CREATE POLICY "Admin can delete accidents" ON accidents FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Manage assignments" ON assignments FOR ALL USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE accidents, ambulances, hospitals, assignments;
