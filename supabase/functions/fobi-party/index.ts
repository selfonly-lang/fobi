import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const origin="https://fobi.self.com.tw";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers});}
function pad(n:number){return String(n).padStart(2,"0")}
function twTradeDate(){
  const d=new Date(Date.now()+8*60*60*1000);
  return d.getUTCFullYear()+"/"+pad(d.getUTCMonth()+1)+"/"+pad(d.getUTCDate())+" "+pad(d.getUTCHours())+":"+pad(d.getUTCMinutes())+":"+pad(d.getUTCSeconds());
}
function ecpayEncode(s:string){
  return encodeURIComponent(s)
    .replace(/%20/g,"+")
    .replace(/~/g,"%7E")
    .toLowerCase();
}
async function sha256Upper(s:string){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
}
async function checkMac(params:Record<string,string>,hashKey:string,hashIV:string){
  const pairs=Object.keys(params)
    .filter(k=>k!=="CheckMacValue")
    .sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(k=>k+"="+String(params[k]??""));
  const raw="HashKey="+hashKey+"&"+pairs.join("&")+"&HashIV="+hashIV;
  return await sha256Upper(ecpayEncode(raw));
}
function safeTradeNo(orderId:string){
  const core=orderId.replace(/-/g,"").slice(-8).toUpperCase();
  const stamp=Date.now().toString(36).toUpperCase();
  return ("FB"+stamp+core).slice(0,20);
}
function parseDate(s:string|null){
  if(!s) return null;
  const m=s.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if(!m) return null;
  return new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]-8,+m[5],+m[6])).toISOString();
}


const END=Date.parse("2026-10-31T22:00:00+08:00");
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 const url=new URL(req.url),action=url.searchParams.get("action");
 const production=Deno.env.get("ECPAY_MODE")==="production";
 const merchantId=(Deno.env.get("ECPAY_MERCHANT_ID")||"").trim();
 const hashKey=(Deno.env.get("ECPAY_HASH_KEY")||"").trim();
 const hashIV=(Deno.env.get("ECPAY_HASH_IV")||"").trim();
 const ready=production&&Boolean(merchantId&&hashKey&&hashIV);
 if(req.method==="GET"&&action==="status")return json({ok:true,ready,mode:production?"production":"stage",price:2500,currency:"TWD",event_id:"halloween-20261031",sales_open:Date.now()<END,payment_host:ready?"payment.ecpay.com.tw":null});
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 try{
  if(action==="callback"&&req.method==="POST"){
   const plain=(body:string,status=200)=>new Response(body,{status,headers:{"Content-Type":"text/plain; charset=utf-8"}});
   if(!ready)return plain("0|PaymentNotConfigured",503);
   const form=await req.formData(),params:Record<string,string>={};
   for(const [k,v]of form.entries())params[k]=String(v);
   const expected=await checkMac(params,hashKey,hashIV);
   if(!params.CheckMacValue||params.CheckMacValue.toUpperCase()!==expected||params.MerchantID!==merchantId)return plain("0|InvalidSignature",400);
   if(params.SimulatePaid==="1")return plain("0|SimulatedPaymentRejected",400);
   const {data:order,error}=await db.from("fobi_party_orders").select("id,amount,payment_status").eq("ecpay_trade_no",params.MerchantTradeNo||"").maybeSingle();
   if(error||!order)return plain("0|OrderNotFound",404);
   if(Number(params.TradeAmt)!==order.amount)return plain("0|AmountMismatch",400);
   if(params.RtnCode==="1"&&order.payment_status!=="paid"){
    const {error:updateError}=await db.from("fobi_party_orders").update({payment_status:"paid",paid_at:parseDate(params.PaymentDate)||new Date().toISOString(),payment_meta:params}).eq("id",order.id).eq("payment_status","pending");
    if(updateError)return plain("0|DBError",500);
   }
   return plain("1|OK");
  }
  if(req.method==="GET"&&action==="order"){
   const orderNo=url.searchParams.get("order")||"";
   if(!/^FP[a-f0-9]{32}$/.test(orderNo))return json({ok:false,error:"invalid_order"},400);
   const {data,error}=await db.from("fobi_party_orders").select("order_no,quantity,amount,payment_status,paid_at").eq("order_no",orderNo).maybeSingle();
   if(error||!data)return json({ok:false,error:"order_not_found"},404);
   return json({ok:true,order:data});
  }
  if(req.method!=="POST")return json({ok:false,error:"not_found"},404);
  const body=await req.json().catch(()=>({}));
  if(body.action!=="start")return json({ok:false,error:"unsupported_action"},400);
  if(req.headers.get("Origin")!==origin)return json({ok:false,error:"invalid_origin"},403);
  if(!ready)return json({ok:false,error:"payment_unavailable"},503);
  if(Date.now()>=END)return json({ok:false,error:"event_closed"},409);
  const name=String(body.name||"").trim(),phone=String(body.phone||"").trim(),email=String(body.email||"").trim(),qty=Number(body.quantity),key=String(body.idempotency_key||"");
  if(!name||name.length>120||!/^\+?[0-9 ()-]{7,30}$/.test(phone)||!/^\S+@\S+\.\S+$/.test(email)||email.length>180||!Number.isInteger(qty)||qty<1||qty>10||!/^[a-f0-9-]{36}$/i.test(key))return json({ok:false,error:"invalid_input"},400);
  const uuid=crypto.randomUUID().replaceAll("-","");
  const payload={order_no:"FP"+uuid,idempotency_key:key,contact_name:name,phone,email,quantity:qty,amount:qty*2500,ecpay_trade_no:"FP"+uuid.slice(0,18)};
  const {error:insertError}=await db.from("fobi_party_orders").upsert(payload,{onConflict:"idempotency_key",ignoreDuplicates:true});
  if(insertError)throw insertError;
  const {data:order,error}=await db.from("fobi_party_orders").select("order_no,quantity,amount,payment_status,ecpay_trade_no,contact_name,phone,email").eq("idempotency_key",key).single();
  if(error)throw error;
  if(order.quantity!==qty||order.contact_name!==name||order.phone!==phone||order.email!==email)return json({ok:false,error:"order_changed"},409);
  if(order.payment_status==="paid")return json({ok:false,error:"already_paid",order_no:order.order_no},409);
  const fields:Record<string,string>={MerchantID:merchantId,MerchantTradeNo:order.ecpay_trade_no,MerchantTradeDate:twTradeDate(),PaymentType:"aio",TotalAmount:String(order.amount),TradeDesc:"FOBI Halloween Party 2026",ItemName:"FOBI 萬聖節佳麗慶功宴生日派對 "+qty+"人",ChoosePayment:"Credit",EncryptType:"1",ReturnURL:"https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-party?action=callback",ClientBackURL:origin+"/party?order="+encodeURIComponent(order.order_no)};
  fields.CheckMacValue=await checkMac(fields,hashKey,hashIV);
  return json({ok:true,mode:"production",order_no:order.order_no,amount:order.amount,payment_url:"https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",fields});
 }catch{console.error("party_request_failed");return json({ok:false,error:"server_error"},500);}
});

