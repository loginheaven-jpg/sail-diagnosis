-- Disposable synthetic fixture matching the operating user_contacts storage.
-- This is not a production migration and contains no operating records.
CREATE TABLE public.user_contacts (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 phone text CHECK(phone IS NULL OR phone ~ '^[+0-9\-\s]{8,20}$'),
 updated_at timestamptz NOT NULL DEFAULT now(), address text, bank_account text,
 forum_name text, forum_phone text
);
INSERT INTO public.user_contacts(user_id,phone) SELECT id,phone FROM public.users;
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_self ON public.user_contacts FOR ALL USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
REVOKE ALL ON public.user_contacts FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_contacts TO authenticated;
GRANT ALL ON public.user_contacts TO service_role;
CREATE OR REPLACE FUNCTION public.email_by_phone(p_phone text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT u.email FROM public.user_contacts c JOIN public.users u ON u.id=c.user_id WHERE c.phone=p_phone LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.phone_exists(p_phone text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_contacts WHERE phone=p_phone) $$;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.users(id,email,nickname,name,role) VALUES(NEW.id,NEW.email,
 coalesce(NEW.raw_user_meta_data->>'nickname',NEW.raw_user_meta_data->>'name',NEW.raw_user_meta_data->>'full_name'),
 coalesce(NEW.raw_user_meta_data->>'name',NEW.raw_user_meta_data->>'full_name'),'user') ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_contacts(user_id,phone) VALUES(NEW.id,coalesce(NEW.phone,NEW.raw_user_meta_data->>'phone')) ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
END $$;
ALTER TABLE public.users DROP COLUMN phone;
NOTIFY pgrst,'reload schema';
