create index pageant_members_user on public.pageant_project_members(user_id);
create index pageant_items_owner on public.pageant_work_items(owner_id);
create index pageant_items_creator on public.pageant_work_items(created_by);
create index pageant_projects_event on public.pageant_projects(event_id);
create index pageant_article_creator on public.pageant_articles(created_by);
create index pageant_article_editor on public.pageant_articles(updated_by);
create index pageant_article_versions_actor on public.pageant_article_versions(actor_id);
create index pageant_workspace_audit_actor on public.pageant_workspace_audit(actor_id);
create index pageant_assets_creator on public.pageant_assets(created_by);
create index pageant_assets_project on public.pageant_assets(project_id);
-- Historic sales are closed. Only trusted server code may execute sales RPCs.
revoke execute on function public.fobi_create_member_order(integer,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.fobi_reserve_country(text,text,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.fobi_create_exposure_draft_on_paid_order() from public,anon,authenticated;
revoke execute on function public.fobi_issue_tickets_on_paid_order() from public,anon,authenticated;
create function public.pageant_create_project(p_data jsonb,p_actor uuid,p_tasks jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.pageant_projects;
begin
 insert into public.pageant_projects(slug,title,status,event_date,venue,domain,summary,public)
 values(p_data->>'slug',p_data->>'title',p_data->>'status',(p_data->>'event_date')::date,p_data->>'venue',p_data->>'domain',p_data->>'summary',(p_data->>'public')::boolean) returning * into p;
 insert into public.pageant_work_items(project_id,kind,stage,title,status,payload,created_by)
 select p.id,'task',t->>'stage',t->>'title','todo',t->'payload',p_actor from jsonb_array_elements(p_tasks)t;
 return to_jsonb(p);
end;$$;
revoke all on function public.pageant_create_project(jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pageant_create_project(jsonb,uuid,jsonb) to service_role;
