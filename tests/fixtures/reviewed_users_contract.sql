-- LOCAL TEST FIXTURE ONLY, never an operating migration.
-- Historical public SAIL SQL has full_name; the authorized read-only review of
-- 2026-10-21 identified operating users.name(text), and no full_name column.
-- Reproduce that declared contract explicitly without editing historical SQL or
-- claiming that this fixture reproduces the complete operating migration chain.
ALTER TABLE public.users RENAME COLUMN full_name TO name;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.users(id,email,nickname,name,phone,role)
 VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'name',NEW.raw_user_meta_data->>'full_name',split_part(NEW.email,'@',1)),
 coalesce(NEW.raw_user_meta_data->>'name',NEW.raw_user_meta_data->>'full_name'),coalesce(NEW.phone,NEW.raw_user_meta_data->>'phone'),
 CASE WHEN NEW.email='operator@fixture.invalid' THEN 'admin' ELSE 'user' END)
 ON CONFLICT(id) DO UPDATE SET name=coalesce(public.users.name,EXCLUDED.name),phone=coalesce(public.users.phone,EXCLUDED.phone);
 RETURN NEW;
END;
$$;
