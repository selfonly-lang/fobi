import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = "https://fobi.self.com.tw";
const jsonHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const callbackHeaders = {"Content-Type":"text/plain; charset=utf-8"};

function json(body: unknown, status=200){ return new Response(JSON.stringify(body),{status,headers:jsonHeaders}); }
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

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:jsonHeaders});
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const url=new URL(req.url);
  const mode=Deno.env.get("ECPAY_MODE")||"stage";
  const isProd=mode==="production";
  const merchantId=isProd ? (Deno.env.get("ECPAY_MERCHANT_ID")||"") : "3002607";
  const hashKey=isProd ? (Deno.env.get("ECPAY_HASH_KEY")||"") : "pwFHCqoQZGmho4w6";
  const hashIV=isProd ? (Deno.env.get("ECPAY_HASH_IV")||"") : "EkRm7iFT261dpevs";
  const payUrl=isProd ? "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5" : "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

  // Read-only public payment readiness; never returns merchant identifiers or signing keys.
  if(req.method==="GET" && url.searchParams.get("action")==="status"){
    const missingProductionSettings = ["ECPAY_MERCHANT_ID","ECPAY_HASH_KEY","ECPAY_HASH_IV"].filter(name => !(Deno.env.get(name)||"").trim());
    return json({ok:true,provider:"ecpay",mode,ready:!isProd||Boolean(merchantId&&hashKey&&hashIV),payment_host:new URL(payUrl).hostname,production_ready:missingProductionSettings.length===0,missing_production_settings:missingProductionSettings});
  }

  if(isProd && (!merchantId||!hashKey||!hashIV)) return json({ok:false,error:"production_credentials_missing"},503);

  try{
    if(url.searchParams.get("action")==="callback"){
      const form=await req.formData();
      const params:Record<string,string>={};
      for(const [k,v] of form.entries()) params[k]=String(v);
      const incoming=String(params.CheckMacValue||"").toUpperCase();
      const expected=await checkMac(params,hashKey,hashIV);
      if(!incoming || incoming!==expected){
        console.error("ECPay invalid CheckMacValue");
        return new Response("0|CheckMacValueError",{status:400,headers:callbackHeaders});
      }

      const merchantTradeNo=String(params.MerchantTradeNo||"");
      const {data:order,error:orderErr}=await db.from("fobi_orders")
        .select("id,order_no,amount,payment_status")
        .eq("ecpay_trade_no",merchantTradeNo)
        .maybeSingle();
      if(orderErr||!order) return new Response("0|OrderNotFound",{status:404,headers:callbackHeaders});
      if(Number(params.TradeAmt||0)!==Number(order.amount)) return new Response("0|AmountMismatch",{status:400,headers:callbackHeaders});

      if(String(params.RtnCode)==="1"){
        const {error}=await db.rpc("fobi_mark_order_paid",{
          p_order_no:order.order_no,
          p_ecpay_trade_no:merchantTradeNo,
          p_trade_no:String(params.TradeNo||""),
          p_paid_at:parseDate(params.PaymentDate||null),
          p_payment_type:String(params.PaymentType||""),
          p_raw:params
        });
        if(error){console.error(error);return new Response("0|DBError",{status:500,headers:callbackHeaders});}
      } else {
        await db.from("fobi_orders").update({payment_meta:params}).eq("id",order.id);
      }
      return new Response("1|OK",{headers:callbackHeaders});
    }

    if(req.method!=="POST") return json({ok:false,error:"method_not_allowed"},405);
    const body=await req.json().catch(()=>({}));
    if(body?.action!=="start") return json({ok:false,error:"unsupported_action"},400);
    const orderNo=String(body.order_no||"").trim();
    if(!orderNo) return json({ok:false,error:"missing_order_no"},400);

    const {data:order,error}=await db.from("fobi_orders")
      .select("id,order_no,type,amount,payment_status,ecpay_trade_no,interest_id")
      .eq("order_no",orderNo).maybeSingle();
    if(error||!order) return json({ok:false,error:"order_not_found"},404);
    if(order.payment_status==="paid") return json({ok:false,error:"already_paid"},409);

    let tradeNo=order.ecpay_trade_no;
    if(!tradeNo){
      tradeNo=safeTradeNo(order.id);
      const {error:uerr}=await db.from("fobi_orders").update({ecpay_trade_no:tradeNo}).eq("id",order.id);
      if(uerr) throw uerr;
    }

    const itemName=order.type==="sponsor" ? "FOBI 2026 國家桌贊助" : "FOBI 2026 世界總決賽入席券";
    const params:Record<string,string>={
      MerchantID:merchantId,
      MerchantTradeNo:tradeNo,
      MerchantTradeDate:twTradeDate(),
      PaymentType:"aio",
      TotalAmount:String(order.amount),
      TradeDesc:"FOBI 2026",
      ItemName:itemName,
      ReturnURL:"https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-payment?action=callback",
      ChoosePayment:"ALL",
      EncryptType:"1",
      ClientBackURL:"https://fobi.self.com.tw/payment-result.html?order="+encodeURIComponent(order.order_no)
    };
    params.CheckMacValue=await checkMac(params,hashKey,hashIV);
    return json({ok:true,mode,payment_url:payUrl,fields:params,order_no:order.order_no,amount:order.amount});
  }catch(err){
    console.error(err);
    return json({ok:false,error:"server_error"},500);
  }
});
