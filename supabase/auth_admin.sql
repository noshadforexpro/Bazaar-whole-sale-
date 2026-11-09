-- Run AFTER schema.sql in the Supabase SQL Editor.
-- This file creates profiles for new Auth users and seller applications in pending state.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_role public.account_role;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_city text;
begin
  -- Never allow a public signup to create an admin account.
  if meta->>'role' = 'seller' then
    chosen_role := 'seller';
  else
    chosen_role := 'buyer';
  end if;
  user_city := nullif(trim(coalesce(meta->>'city', '')), '');

  insert into public.profiles (id, full_name, phone, role, city)
  values (
    new.id,
    coalesce(nullif(trim(meta->>'full_name'), ''), ''),
    nullif(trim(coalesce(meta->>'phone', '')), ''),
    chosen_role,
    user_city
  );

  if chosen_role = 'seller' then
    insert into public.seller_profiles (user_id, business_name, business_type, city, address, verification_status)
    values (
      new.id,
      coalesce(nullif(trim(meta->>'business_name'), ''), 'Pending business details'),
      nullif(trim(coalesce(meta->>'business_type', '')), ''),
      coalesce(user_city, 'Not provided'),
      coalesce(nullif(trim(meta->>'address'), ''), 'Pending address'),
      'pending'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Public seller applications cannot change their own verification state or business identity.
-- Admin operations are performed by a server action after checking profiles.role = 'admin'.
create policy "seller application owner can add documents"
on public.verification_documents for insert to authenticated
with check (auth.uid() = seller_id and exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role = 'seller'
));

-- Ensure sellers can only activate products after verification. Drop the overly broad starter update policy.
drop policy if exists "seller updates own products" on public.products;
create policy "seller updates own draft or verified products"
on public.products for update to authenticated
using (auth.uid() = seller_id)
with check (
  auth.uid() = seller_id and (
    status in ('draft', 'paused') or exists (
      select 1 from public.seller_profiles s
      where s.user_id = auth.uid() and s.verification_status = 'verified'
    )
  )
);

-- Private bucket for identity/business documents. Never make this bucket public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-verification', 'seller-verification', false, 5242880, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','application/pdf'];

create policy "seller uploads own verification files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'seller-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'seller')
);
create policy "seller reads own verification files"
on storage.objects for select to authenticated
using (
  bucket_id = 'seller-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- IMPORTANT: Create the first admin only after you sign up with your own account.
-- Replace the UUID with that account's auth.users.id, then run this manually in SQL Editor:
-- update public.profiles set role = 'admin' where id = 'YOUR-AUTH-USER-UUID';
-- Never expose the service-role key in browser code or NEXT_PUBLIC_* variables.
