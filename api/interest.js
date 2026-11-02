export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 return res.status(410).json({ok:false,error:'event_closed',archive_url:'https://fobi.self.com.tw/Fobi'});
}
