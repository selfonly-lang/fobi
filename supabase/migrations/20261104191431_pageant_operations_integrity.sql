alter table public.pageant_admissions drop constraint pageant_admissions_status_check;
alter table public.pageant_admissions add constraint pageant_admissions_status_check check(status in('valid','held','used','void'));
alter table public.pageant_refunds add column admission_ids uuid[] not null default '{}';
alter table public.pageant_media add column publication jsonb;
alter table public.pageant_proposals add column updated_by uuid references auth.users(id);
alter table public.pageant_publications add column updated_by uuid references auth.users(id);
create index pageant_proposal_updated_by on public.pageant_proposals(updated_by);create index pageant_publication_updated_by on public.pageant_publications(updated_by);
create table public.pageant_document_versions (
 id bigint generated always as identity primary key,entity_kind text not null,entity_id uuid not null,version integer not null,snapshot jsonb not null,actor_id uuid references auth.users(id),created_at timestamptz not null default now(),unique(entity_kind,entity_id,version)
);
alter table public.pageant_document_versions enable row level security;revoke all on public.pageant_document_versions from anon,authenticated;
create index pageant_document_version_actor on public.pageant_document_versions(actor_id);
create function public.pageant_document_snapshot()returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.pageant_document_versions(entity_kind,entity_id,version,snapshot,actor_id)values(tg_table_name,new.id,new.version,to_jsonb(new),coalesce(new.updated_by,new.created_by));return new;
end;$$;
revoke all on function public.pageant_document_snapshot() from public,anon,authenticated;
create trigger pageant_activity_version before update on public.pageant_activities for each row execute function public.pageant_increment_version();
create trigger pageant_proposal_version before update on public.pageant_proposals for each row execute function public.pageant_increment_version();
create trigger pageant_publication_version before update on public.pageant_publications for each row execute function public.pageant_increment_version();
create trigger pageant_proposal_snapshot after insert or update on public.pageant_proposals for each row execute function public.pageant_document_snapshot();
create trigger pageant_publication_snapshot after insert or update on public.pageant_publications for each row execute function public.pageant_document_snapshot();
create function public.pageant_register_free(p_actor uuid,p_activity uuid,p_profile jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.pageant_activities;p public.pageant_projects;r public.pageant_registrations;n integer;begin
 select * into a from public.pageant_activities where id=p_activity for update;
 if not found then raise exception 'activity_not_found';end if;
 select * into p from public.pageant_projects where id=a.project_id;
 if a.status<>'open' or a.amount<>0 or p.review_status<>'approved' or not p.public or p.status in('closed','archived') or a.starts_at is null or coalesce(a.ends_at,a.starts_at)<=now() then raise exception 'activity_not_on_sale';end if;
 select * into r from public.pageant_registrations where activity_id=a.id and user_id=p_actor;
 if found then return to_jsonb(r);end if;
 select count(*) into n from public.pageant_registrations where activity_id=a.id and status in('pending','approved','attended');
 if a.capacity>0 and n>=a.capacity then raise exception 'sold_out';end if;
 insert into public.pageant_registrations(activity_id,user_id,profile)values(a.id,p_actor,p_profile)returning *into r;return to_jsonb(r);
end;$$;
create function public.pageant_request_refund(p_actor uuid,p_order uuid,p_quantity integer,p_reason text)returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.pageant_commerce_orders;ids uuid[];r public.pageant_refunds;begin
 select * into o from public.pageant_commerce_orders where id=p_order for update;
 if not found or o.status not in('paid','partially_refunded') or p_quantity<1 or p_quantity>o.quantity or length(p_reason)<1 then raise exception 'order_not_refundable';end if;
 select array_agg(id) into ids from(select id from public.pageant_admissions where order_id=o.id and status='valid' order by ticket_no limit p_quantity for update)s;
 if coalesce(array_length(ids,1),0)<>p_quantity then raise exception 'not_enough_unused_tickets';end if;
 if o.refunded_amount+o.unit_amount*p_quantity>o.amount then raise exception 'refund_exceeds_payment';end if;
 update public.pageant_admissions set status='held' where id=any(ids);
 insert into public.pageant_refunds(order_id,amount,reason,created_by,admission_ids)values(o.id,o.unit_amount*p_quantity,p_reason,p_actor,ids)returning*into r;return to_jsonb(r);
end;$$;
create function public.pageant_review_refund(p_id uuid,p_status text)returns void language plpgsql security definer set search_path='' as $$
declare r public.pageant_refunds;begin
 select * into r from public.pageant_refunds where id=p_id for update;
 if r.status not in('requested','failed')or p_status not in('approved','rejected')then raise exception 'invalid_refund_transition';end if;
 update public.pageant_refunds set status=p_status,updated_at=now()where id=r.id;
 if p_status='rejected'then update public.pageant_admissions set status='valid'where id=any(r.admission_ids)and status='held';end if;
end;$$;
-- A partial refund invalidates exactly the reserved, unused admissions.
create or replace function public.pageant_complete_refund(p_refund uuid,p_reference text,p_actor uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.pageant_refunds;o public.pageant_commerce_orders;total integer;old_comm integer;new_comm integer;begin
 select * into r from public.pageant_refunds where id=p_refund for update;
 if r.status='completed'then return to_jsonb(r);end if;
 if r.status not in('approved','processing')or length(p_reference)<3 then raise exception 'refund_not_approved';end if;
 select *into o from public.pageant_commerce_orders where id=r.order_id for update;
 total=o.refunded_amount+r.amount;if total>o.amount then raise exception 'refund_exceeds_payment';end if;
 old_comm=floor((o.amount-o.refunded_amount)::numeric*o.rate_bps/10000)::integer;new_comm=floor((o.amount-total)::numeric*o.rate_bps/10000)::integer;
 update public.pageant_commerce_orders set refunded_amount=total,status=case when total=amount then 'refunded'else'partially_refunded'end where id=o.id;
 update public.pageant_refunds set status='completed',provider_reference=p_reference,updated_at=now()where id=r.id;
 update public.pageant_admissions set status='void'where id=any(r.admission_ids);
 insert into public.pageant_finance_entries(project_id,order_id,kind,amount,description,source_key,created_by)values(o.project_id,o.id,'refund',-r.amount,'退款 '||p_reference,'refund:'||r.id,p_actor),(o.project_id,o.id,'commission',old_comm-new_comm,'退款後服務費沖銷','refund-fee:'||r.id,p_actor);
 return jsonb_build_object('order_id',o.id,'refunded',total);
end;$$;
-- Settlement requests and order retries are serialized, not just checked in the UI.
create unique index pageant_one_active_settlement on public.pageant_settlements(project_id)where status in('requested','review','approved');
create unique index pageant_one_active_refund_admissions on public.pageant_refunds(id)where status in('requested','approved','processing');
do $$declare f regprocedure;begin foreach f in array array['public.pageant_register_free(uuid,uuid,jsonb)'::regprocedure,'public.pageant_request_refund(uuid,uuid,integer,text)'::regprocedure,'public.pageant_review_refund(uuid,text)'::regprocedure]loop execute format('revoke all on function %s from public,anon,authenticated',f);execute format('grant execute on function %s to service_role',f);end loop;end$$;
