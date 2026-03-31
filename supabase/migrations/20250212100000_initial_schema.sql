/*
  # Initial Schema for MD Courier Service
  
  ## Structure Details:
  - profiles: Extends auth.users with role (admin/user) and display name.
  - companies: Client companies that send parcels.
  - shops: Destination shops.
  - day_sheets: Income and Expense tracking.
  - pickups: Records a pickup event from a company by a user.
  - pickup_items: Junction table linking pickups to specific shops.
  - deliveries: Records a delivery event to a shop by a user.
  
  ## Security:
  - RLS enabled on all tables.
  - Policies allow authenticated users to read/write as per requirements.
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create shops table
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create day_sheets table
CREATE TABLE IF NOT EXISTS public.day_sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pickups table
CREATE TABLE IF NOT EXISTS public.pickups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pickup_items table (Many-to-Many link between Pickup and Shops)
CREATE TABLE IF NOT EXISTS public.pickup_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Policies

-- Profiles: Read all, Update own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Companies: Read all, Admin insert/update/delete
CREATE POLICY "Companies viewable by authenticated users" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update companies" ON public.companies FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete companies" ON public.companies FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Shops: Read all, Admin insert/update/delete
CREATE POLICY "Shops viewable by authenticated users" ON public.shops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert shops" ON public.shops FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can update shops" ON public.shops FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete shops" ON public.shops FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Day Sheets: Admin full access
CREATE POLICY "Admin full access day_sheets" ON public.day_sheets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Pickups: Users can insert, Admin can view all
CREATE POLICY "Pickups viewable by authenticated users" ON public.pickups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert pickups" ON public.pickups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Pickup Items: Users can insert, Admin can view all
CREATE POLICY "Pickup items viewable by authenticated users" ON public.pickup_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert pickup items" ON public.pickup_items FOR INSERT TO authenticated WITH CHECK (true);

-- Deliveries: Users can insert, Admin can view all
CREATE POLICY "Deliveries viewable by authenticated users" ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert deliveries" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (new.id, split_part(new.email, '@', 1), COALESCE(new.raw_user_meta_data->>'role', 'user'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
