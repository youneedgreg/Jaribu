-- A wig a seller lists. Texture, constructions, colours and lace shades are ids from
-- src/lib/shop/catalog.ts; the checks here repeat src/lib/seller/wig-fields.ts.

create table wig (
  id uuid primary key,
  shop_id uuid not null references shop (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  price_kes integer not null check (price_kes between 100 and 1000000),
  length_in integer not null check (length_in between 4 and 40),
  texture text not null,
  constructions text[] not null check (cardinality(constructions) >= 1),
  colorways text[] not null check (cardinality(colorways) >= 1),
  -- Empty when the wig has no lace: the lace match is then not shown.
  lace_shades text[] not null default '{}',
  -- The front photo in the private Blob store, also the try-on reference.
  photo_path text not null,
  photo_width integer not null check (photo_width between 1 and 1024),
  photo_height integer not null check (photo_height between 1 and 1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wig_shop_id_idx on wig (shop_id, created_at);
