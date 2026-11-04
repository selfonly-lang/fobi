// Generates idempotent historical import SQL for an operator; never connects to a database.
import fs from 'node:fs';
import {workflow} from '../lib/workspace-model.js';
const news=JSON.parse(fs.readFileSync(new URL('../content/news.json',import.meta.url),'utf8'));
const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const rows=news.map(n=>({...n,sections:n.sections||[]}));
console.log(`insert into public.pageant_articles(project_id,slug,title,status,content,publication,publish_at)
select p.id,x->>'slug',x->>'title','published',x,x,((x->>'date')||'T02:00:00Z')::timestamptz
from public.pageant_projects p cross join jsonb_array_elements(${literal(rows)})x where p.slug='fobi-2026' on conflict(slug) do nothing;`);
const tasks=workflow('00000000-0000-4000-8000-000000000000');
console.log(`insert into public.pageant_work_items(project_id,kind,stage,title,payload)
select p.id,'task',x->>'stage',x->>'title',x->'payload' from public.pageant_projects p cross join jsonb_array_elements(${literal(tasks)})x where p.slug='fobi-2026'
and not exists(select 1 from public.pageant_work_items i where i.project_id=p.id and i.kind='task' and i.title=x->>'title');`);
const sponsors=news.slice(1).map(n=>({title:n.partner,payload:{company:n.partner,deliverables:'品牌新聞：/news/'+n.slug,note:'既有報導已匯入，合約與權益完成情形請補錄。'}}));
console.log(`insert into public.pageant_work_items(project_id,kind,stage,title,payload)
select p.id,'sponsor','sponsors',x->>'title',x->'payload' from public.pageant_projects p cross join jsonb_array_elements(${literal(sponsors)})x where p.slug='fobi-2026'
and not exists(select 1 from public.pageant_work_items i where i.project_id=p.id and i.kind='sponsor' and i.title=x->>'title');`);
