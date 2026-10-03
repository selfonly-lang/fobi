export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'method_not_allowed'});
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key) return res.status(503).json({ok:false,error:'backend_not_configured'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const payload={
      type:body.type==='member'?'member':'sponsor',
      country_code:body.country_code||null,
      tier:body.tier||null,
      member_count:Number(body.member_count||1),
      company:body.company||null,
      contact_name:String(body.contact_name||'').trim(),
      phone:String(body.phone||'').trim(),
      email:String(body.email||'').trim(),
      note:body.note||null,
      source:'fobi.self.com.tw'
    };
    if(!payload.contact_name||!payload.phone||!payload.email) return res.status(400).json({ok:false,error:'missing_required_fields'});
    const r=await fetch(url+'/rest/v1/fobi_interests',{
      method:'POST',
      headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(payload)
    });
    const data=await r.json();
    if(!r.ok) return res.status(500).json({ok:false,error:'database_error',detail:data});
    return res.status(200).json({ok:true,id:data?.[0]?.id||null});
  }catch(e){return res.status(500).json({ok:false,error:'server_error'});}
}
