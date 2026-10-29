-- An order a shopper sent on WhatsApp, for the seller's stats and the order card page.
-- Nothing about the shopper is kept: session_id and result_task_id only point at the try-on
-- picture in Blob, which is deleted 24 hours after it was made (the card stops showing it then).

create table wig_order (
  id uuid primary key,
  wig_id uuid not null references wig (id) on delete cascade,
  -- Catalog ids; colorway is null for "as photographed", lace_shade when the wig has no lace.
  colorway text,
  construction text not null,
  lace_shade text,
  session_id text not null,
  result_task_id text not null,
  created_at timestamptz not null default now()
);

create index wig_order_wig_id_idx on wig_order (wig_id, created_at);
