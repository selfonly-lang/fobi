-- Personal participation fee: NT$4,000. Existing orders remain unchanged.
begin;
do $price_update$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.fobi_create_member_order(integer,text,text,text,text)'::regprocedure);
  if position('v_amount := 3000 * v_count;' in definition) > 0 then
    execute replace(definition, 'v_amount := 3000 * v_count;', 'v_amount := 4000 * v_count;');
  elsif position('v_amount := 4000 * v_count;' in definition) = 0 then
    raise exception 'Unexpected member pricing implementation; review before changing';
  end if;
end;
$price_update$;
update public.fobi_site_config
set member_price = 4000, updated_at = now()
where id = 'main' and member_price in (3000, 4000);
commit;
