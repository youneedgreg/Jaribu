-- How many try-ons were started on each seller wig, for the seller's stats. One number per wig:
-- nothing about the shopper, their session or their photo is kept. Demo wigs live in code and
-- have no row here.

create table wig_tryon_count (
  wig_id uuid primary key references wig (id) on delete cascade,
  tryons integer not null default 0 check (tryons >= 0)
);
