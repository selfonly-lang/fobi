export default async function handler(req,res){
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_ANON_KEY;
  if(!url||!key) return res.status(503).json({ok:false,error:'backend_not_configured'});
  try{
    const r=await fetch(url+'/rest/v1/fobi_countries?select=code,name_en,name_zh,table_no,status,contestant_name,contestant_photo_url,sponsor_name,reserved_until&order=table_no.asc',{headers:{apikey:key,Authorization:'Bearer '+key}});
    const data=await r.json();
    if(!r.ok) return res.status(500).json({ok:false,error:'database_error'});
    return res.status(200).json({ok:true,countries:data});
  }catch(e){return res.status(500).json({ok:false,error:'server_error'});}
}
