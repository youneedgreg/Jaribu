-- The sweep clears these two columns once an order is 24 hours old, because the picture they
-- point at is gone by then and a session id shouldn't outlive it. The order's picks stay.

alter table wig_order
  alter column session_id drop not null,
  alter column result_task_id drop not null;
