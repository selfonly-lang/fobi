create or replace function public.pageant_confirm_payment(p_order uuid,p_reference text,p_amount integer,p_event text,p_payload jsonb,p_tickets jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.pageant_commerce_orders;t jsonb;a public.pageant_activities;used integer;over_capacity boolean;ticket_ids uuid[];begin
 select * into o from public.pageant_commerce_orders where id=p_order for update;
 if not found or o.amount<>p_amount then raise exception 'payment_mismatch';end if;
 if o.status in('paid','refund_pending','partially_refunded','refunded') then return jsonb_build_object('duplicate',true,'order_id',o.id);end if;
 if o.status not in('pending','expired','cancelled')then raise exception 'order_not_payable';end if;
 select * into a from public.pageant_activities where id=o.activity_id for update;
 select (coalesce((select count(*) from public.pageant_admissions t join public.pageant_commerce_orders x on x.id=t.order_id where x.activity_id=a.id and x.id<>o.id and t.status in('valid','held','used')),0)+coalesce((select sum(quantity) from public.pageant_commerce_orders where activity_id=a.id and id<>o.id and status='pending' and expires_at>now()),0)+coalesce((select count(*)from public.pageant_registrations where activity_id=a.id and status in('pending','approved','attended')),0))::integer into used;
 over_capacity=(a.capacity>0 and used+o.quantity>a.capacity) or a.status in('closed','cancelled','archived') or coalesce(a.ends_at,a.starts_at)<=now() or exists(select 1 from public.pageant_projects where id=a.project_id and status in('closed','archived')); 
 if jsonb_array_length(p_tickets)<>o.quantity then raise exception 'ticket_count_mismatch';end if;
 insert into public.pageant_payment_events(order_id,provider_event,kind,payload)values(o.id,p_event,'payment',p_payload) on conflict(provider_event) do nothing;
 if not found then return jsonb_build_object('duplicate',true,'order_id',o.id);end if;
 update public.pageant_commerce_orders set status=case when over_capacity then 'refund_pending'else'paid'end,paid_at=now() where id=o.id;
 insert into public.pageant_finance_entries(project_id,order_id,kind,amount,description,source_key)values(o.project_id,o.id,'sale',o.amount,'綠界付款 '||p_reference,'sale:'||o.id),(o.project_id,o.id,'commission',-floor(o.amount::numeric*o.rate_bps/10000)::integer,'平台成交服務費','commission:'||o.id);
 for t in select * from jsonb_array_elements(p_tickets) loop
 insert into public.pageant_admissions(id,order_id,user_id,ticket_no,token_hash,status)values((t->>'id')::uuid,o.id,o.user_id,t->>'ticket_no',t->>'token_hash',case when over_capacity then 'held'else'valid'end);end loop;
 if over_capacity then
 select array_agg(id)into ticket_ids from public.pageant_admissions where order_id=o.id;
 insert into public.pageant_refunds(order_id,amount,reason,created_by,admission_ids)values(o.id,o.amount,'逾期付款且名額不足，待財務確認退款',o.user_id,ticket_ids);
 end if;
 insert into public.pageant_notifications(user_id,title,body,url)values(o.user_id,case when over_capacity then '付款已入帳，名額需協調退款'else'付款完成，票券已建立'end,o.order_no,'/account?tab=tickets');
 return jsonb_build_object('duplicate',false,'order_id',o.id);
end;$$;
create or replace function public.pageant_reserve_order(p_actor uuid,p_activity uuid,p_quantity integer,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.pageant_activities;p public.pageant_projects;f public.pageant_fee_rules;o public.pageant_commerce_orders;used integer;cfg jsonb;begin
 if p_quantity<1 or p_quantity>10 then raise exception 'invalid_quantity';end if;
 select * into o from public.pageant_commerce_orders where user_id=p_actor and idempotency_key=p_key;
 if found then if o.activity_id<>p_activity or o.quantity<>p_quantity then raise exception 'idempotency_mismatch';end if;return to_jsonb(o);end if;
 select * into a from public.pageant_activities where id=p_activity for update;
 if not found then raise exception 'activity_not_found';end if;
 select * into o from public.pageant_commerce_orders where user_id=p_actor and idempotency_key=p_key;
 if found then if o.activity_id<>p_activity or o.quantity<>p_quantity then raise exception 'idempotency_mismatch';end if;return to_jsonb(o);end if;
 select * into p from public.pageant_projects where id=a.project_id;
 if p.review_status<>'approved' or not p.public or p.status in('closed','archived') or a.status<>'open' or a.starts_at is null or coalesce(a.ends_at,a.starts_at)<=now() then raise exception 'activity_not_on_sale';end if;
 select value into cfg from public.pageant_settings where key='commerce';
 if not coalesce((cfg->>'enabled')::boolean,false) or not coalesce((cfg->>'merchant_reviewed')::boolean,false) then raise exception 'commerce_not_enabled';end if;
 select * into f from public.pageant_fee_rules where kind=a.fee_kind and (project_id=p.id or project_id is null) order by project_id nulls last limit 1;
 if not found or not f.enabled or f.rate_bps is null or f.gateway_fee_bearer is null or length(f.terms)=0 or length(a.terms)=0 or length(a.refund_policy)=0 then raise exception 'terms_or_fee_not_ready';end if;
 if a.amount<=0 then raise exception 'use_free_registration';end if;
 select (coalesce((select count(*)from public.pageant_admissions t join public.pageant_commerce_orders x on x.id=t.order_id where x.activity_id=a.id and t.status in('valid','held','used')),0)+coalesce((select sum(quantity)from public.pageant_commerce_orders where activity_id=a.id and status='pending' and expires_at>now()),0)+coalesce((select count(*)from public.pageant_registrations where activity_id=a.id and status in('pending','approved','attended')),0))::integer into used;
 if a.capacity>0 and used+p_quantity>a.capacity then raise exception 'sold_out';end if;
 insert into public.pageant_commerce_orders(order_no,project_id,activity_id,user_id,quantity,unit_amount,amount,fee_kind,rate_bps,gateway_fee_bearer,terms_snapshot,idempotency_key,ecpay_trade_no)
 values('PG'||to_char(now(),'YYMMDDHH24MISS')||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),p.id,a.id,p_actor,p_quantity,a.amount,a.amount*p_quantity,a.fee_kind,f.rate_bps,f.gateway_fee_bearer,jsonb_build_object('activity_terms',a.terms,'refund_policy',a.refund_policy,'fee_terms',f.terms),p_key,'PG'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18))) returning * into o;
 return to_jsonb(o);
end;$$;

create or replace function public.pageant_register_free(p_actor uuid,p_activity uuid,p_profile jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.pageant_activities;p public.pageant_projects;r public.pageant_registrations;n integer;begin
 select * into a from public.pageant_activities where id=p_activity for update;
 if not found then raise exception 'activity_not_found';end if;
 select * into p from public.pageant_projects where id=a.project_id;
 if a.status<>'open' or a.amount<>0 or p.review_status<>'approved' or not p.public or p.status in('closed','archived') or a.starts_at is null or coalesce(a.ends_at,a.starts_at)<=now() then raise exception 'activity_not_on_sale';end if;
 select * into r from public.pageant_registrations where activity_id=a.id and user_id=p_actor;
 if found then return to_jsonb(r);end if;
 select ((select count(*) from public.pageant_registrations where activity_id=a.id and status in('pending','approved','attended'))+(select count(*) from public.pageant_admissions t join public.pageant_commerce_orders o on o.id=t.order_id where o.activity_id=a.id and t.status in('valid','held','used'))+coalesce((select sum(quantity)from public.pageant_commerce_orders where activity_id=a.id and status='pending' and expires_at>now()),0))::integer into n;
 if a.capacity>0 and n>=a.capacity then raise exception 'sold_out';end if;
 insert into public.pageant_registrations(activity_id,user_id,profile)values(a.id,p_actor,p_profile)returning *into r;return to_jsonb(r);
end;$$;
