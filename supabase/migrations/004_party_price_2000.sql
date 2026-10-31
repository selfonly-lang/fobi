alter table public.fobi_party_orders drop constraint fobi_party_orders_check; alter table public.fobi_party_orders add constraint fobi_party_orders_check check(amount=quantity*2000);
