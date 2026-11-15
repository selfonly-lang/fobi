-- Run inside a transaction with pageant.test_member and pageant.test_other
-- set to two disposable Auth UUIDs. The caller must ROLLBACK the transaction.
do $$
declare
 member_id uuid:=current_setting('pageant.test_member')::uuid;
 other_id uuid:=current_setting('pageant.test_other')::uuid;
 activity_id uuid:=gen_random_uuid();
 first_result jsonb; repeated jsonb; rejected boolean;
begin
 if has_function_privilege('anon','public.pageant_register_free(uuid,uuid,jsonb)','execute') or
    has_function_privilege('authenticated','public.pageant_register_free(uuid,uuid,jsonb)','execute') then
  raise exception 'RPC unexpectedly callable without service authorization';
 end if;
 insert into public.pageant_activities(id,project_id,kind,title,status,starts_at,capacity,config)
 values(activity_id,'d2acc4c7-3412-4df2-8c2d-0df2020245d5','pageant','Private rolling interest SQL QA','open',now()-interval '1 day',1,'{"registration_mode":"interest"}');
 first_result:=public.pageant_register_free(member_id,activity_id,'{"name":"Private test"}');
 if first_result->>'status'<>'pending' then raise exception 'Interest must stay pending';end if;
 repeated:=public.pageant_register_free(member_id,activity_id,'{"name":"Replay"}');
 if first_result->>'id'<>repeated->>'id' then raise exception 'Duplicate interest registration';end if;
 rejected:=false;begin perform public.pageant_register_free(other_id,activity_id,'{}');exception when others then if sqlerrm='sold_out' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Capacity not enforced';end if;
 update public.pageant_activities set config='{}' where id=activity_id;
 rejected:=false;begin perform public.pageant_register_free(member_id,activity_id,'{}');exception when others then if sqlerrm='activity_not_on_sale' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Ordinary event closing rule changed';end if;
 update public.pageant_activities set config='{"registration_mode":"interest"}',starts_at=now()+interval '1 day' where id=activity_id;
 rejected:=false;begin perform public.pageant_register_free(member_id,activity_id,'{}');exception when others then if sqlerrm='activity_not_on_sale' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Future interest campaign opened early';end if;
 update public.pageant_activities set starts_at=now()-interval '1 day',ends_at=now()-interval '1 minute' where id=activity_id;
 rejected:=false;begin perform public.pageant_register_free(member_id,activity_id,'{}');exception when others then if sqlerrm='activity_not_on_sale' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Interest deadline ignored';end if;
 update public.pageant_activities set ends_at=null,amount=1 where id=activity_id;
 rejected:=false;begin perform public.pageant_register_free(member_id,activity_id,'{}');exception when others then if sqlerrm='activity_not_on_sale' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Paid activity registered without payment';end if;
 update public.pageant_activities set amount=0,status='closed' where id=activity_id;
 rejected:=false;begin perform public.pageant_register_free(member_id,activity_id,'{}');exception when others then if sqlerrm='activity_not_on_sale' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Closed campaign accepted registrations';end if;
 update public.pageant_activities set status='open' where id=activity_id;
 update public.pageant_projects set review_status='pending' where id='d2acc4c7-3412-4df2-8c2d-0df2020245d5';
 rejected:=false;begin perform public.pageant_register_free(member_id,activity_id,'{}');exception when others then if sqlerrm='activity_not_on_sale' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Unapproved project accepted registrations';end if;
end;$$;
