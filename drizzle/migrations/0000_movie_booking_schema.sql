-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- MOVIES
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL,
  genre TEXT NOT NULL,
  language TEXT NOT NULL,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  duration_min INT NOT NULL,
  certificate TEXT NOT NULL DEFAULT 'UA',
  movie_cast TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movies TO anon, authenticated;
GRANT ALL ON public.movies TO service_role;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movies are public" ON public.movies FOR SELECT USING (true);

-- SHOWTIMES
CREATE TABLE public.showtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  screen TEXT NOT NULL,
  theatre TEXT NOT NULL DEFAULT 'Cineverse Grand',
  starts_at TIMESTAMPTZ NOT NULL,
  total_seats INT NOT NULL DEFAULT 90
);
CREATE INDEX showtimes_movie_idx ON public.showtimes (movie_id, starts_at);
GRANT SELECT ON public.showtimes TO anon, authenticated;
GRANT ALL ON public.showtimes TO service_role;
ALTER TABLE public.showtimes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "showtimes are public" ON public.showtimes FOR SELECT USING (true);

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  showtime_id UUID NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  seats TEXT[] NOT NULL,
  total_amount INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bookings_user_idx ON public.bookings (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- BOOKED SEATS (public seat occupancy, no personal data)
CREATE TABLE public.booked_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id UUID NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  seat_code TEXT NOT NULL,
  UNIQUE (showtime_id, seat_code)
);
CREATE INDEX booked_seats_showtime_idx ON public.booked_seats (showtime_id);
GRANT SELECT ON public.booked_seats TO anon, authenticated;
GRANT INSERT ON public.booked_seats TO authenticated;
GRANT ALL ON public.booked_seats TO service_role;
ALTER TABLE public.booked_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seat occupancy is public" ON public.booked_seats FOR SELECT USING (true);
CREATE POLICY "insert seats for own booking" ON public.booked_seats FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

-- SEED MOVIES
INSERT INTO public.movies (slug, title, synopsis, genre, language, rating, duration_min, certificate, movie_cast) VALUES
('neon-requiem', 'Neon Requiem', 'A burned-out detective hunts a ghost in the rain-soaked underbelly of a city that never sleeps, and finds his own past waiting in the dark.', 'Action', 'English', 8.6, 142, 'A', ARRAY['Idris Kwan','Mara Vance','Theo Rask']),
('midnight-ledger', 'Midnight Ledger', 'A junior analyst discovers a second set of books at the biggest bank in the country, and has one night to decide who to trust.', 'Thriller', 'English', 8.1, 128, 'UA', ARRAY['Simon Reyes','Alina Bose','Grace Oduya']),
('paper-lanterns', 'Paper Lanterns', 'Two estranged sisters return to their riverside hometown for a festival that forces them to finally read the letters they never sent.', 'Drama', 'English', 7.9, 118, 'U', ARRAY['Noor Haider','Elise Tran','Dev Menon']),
('double-shift', 'Double Shift', 'The worst diner in town gets a surprise food-critic visit on the one night both cooks decide to quit. Chaos is on the menu.', 'Comedy', 'English', 7.4, 106, 'UA', ARRAY['Rico Alvarez','Penny Shaw','Bobby Lim']),
('rustkeeper', 'Rustkeeper', 'In a world where water is currency, a lone machine-keeper escorts a stolen engine across the dust belt with an army on her heels.', 'Action', 'English', 8.3, 151, 'A', ARRAY['Kira Osei','Jonas Vidal','Amira Stone']),
('monsoon-letters', 'Monsoon Letters', 'Every rain brings back a memory for a Mumbai postman who delivers one last letter to the woman he never forgot.', 'Drama', 'Hindi', 8.8, 134, 'U', ARRAY['Aarav Kapoor','Sanya Pillai','Rahul Nair']);

-- SEED SHOWTIMES: 4 shows a day across 3 screens for the next 4 days
INSERT INTO public.showtimes (movie_id, screen, starts_at)
SELECT m.id,
       s.screen,
       (date_trunc('day', now()) + (d || ' day')::interval + s.slot)
FROM public.movies m
CROSS JOIN LATERAL (VALUES
  ('Screen 1', interval '10 hours 30 minutes'),
  ('Screen 2', interval '13 hours 45 minutes'),
  ('Screen 3', interval '17 hours 15 minutes'),
  ('Screen 1', interval '21 hours 30 minutes')
) AS s(screen, slot)
CROSS JOIN generate_series(0, 3) AS d;

-- SEED a realistic sprinkle of already-booked seats
INSERT INTO public.booked_seats (showtime_id, seat_code)
SELECT st.id, seat
FROM public.showtimes st
CROSS JOIN LATERAL (
  SELECT r.row_label || c.n AS seat
  FROM (VALUES ('A'),('B'),('D'),('E'),('G'),('H')) AS r(row_label)
  CROSS JOIN generate_series(1, 10) AS c(n)
  WHERE ((hashtext(st.id::text || r.row_label || c.n::text) % 100) + 100) % 100 < 22
) AS s(seat)
ON CONFLICT DO NOTHING;