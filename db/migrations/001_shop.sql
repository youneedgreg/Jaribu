-- A seller's shop: one per seller account. Better Auth owns "user"; this table is ours.
-- The checks repeat src/lib/seller/shop-fields.ts so a bad row can't get in another way.

create table shop (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null unique references "user" (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  -- Digits only, country code first, as wa.me wants it (254712345678).
  whatsapp text not null check (whatsapp ~ '^[1-9][0-9]{7,14}$'),
  -- The shop link: /s/<slug>.
  slug text not null unique check (slug ~ '^[a-z0-9](-?[a-z0-9])+$' and char_length(slug) between 3 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
