import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://fobi.self.com.tw",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

function json(body: unknown, status=200){ return new Response(JSON.stringify(body),{status,headers:cors}); }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok",{headers:cors});
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{persistSession:false}});
  try{
    const url = new URL(req.url);

    if(req.method==="GET" && url.searchParams.get("resource")==="config"){
      const {data,error}=await db.from("fobi_site_config").select("*").eq("id","main").maybeSingle();
      if(error) throw error;
      return json({ok:true,config:data});
    }

    if(req.method==="GET" && url.searchParams.get("resource")==="exposure"){
      const {data,error}=await db.from("fobi_exposure_items")
        .select("id,title,channel,description,sort_order")
        .eq("active",true).order("sort_order",{ascending:true});
      if(error) throw error;
      return json({ok:true,items:data});
    }

    if(req.method==="GET" && url.searchParams.get("resource")==="slides"){
      const {data,error}=await db.from("fobi_hero_slides").select("id,title,subtitle,image_url,link_url,sort_order").eq("active",true).order("sort_order",{ascending:true});
      if(error) throw error; return json({ok:true,items:data});
    }
    if(req.method==="GET" && url.searchParams.get("resource")==="sponsors"){
      const {data,error}=await db.from("fobi_sponsor_profiles").select("id,name,logo_url,website_url,tier,description,sort_order").eq("active",true).order("sort_order",{ascending:true});
      if(error) throw error; return json({ok:true,items:data});
    }
    if(req.method==="GET" && url.searchParams.get("resource")==="participants"){
      const {data,error}=await db.from("fobi_participant_profiles").select("id,display_name,avatar_url,profile_url,country_code,subtitle,sort_order").eq("active",true).order("sort_order",{ascending:true});
      if(error) throw error; return json({ok:true,items:data});
    }

    if(req.method==="GET" && url.searchParams.get("resource")==="ticket"){
      const token=String(url.searchParams.get("token")||"").trim();
      if(!token) return json({ok:false,error:"missing_token"},400);
      const {data,error}=await db.from("fobi_tickets").select("ticket_no,holder_name,status,checked_in_at,ticket_type,sponsor_tier,company,country_code,afterparty_entitlement,guest_no,qr_token").eq("qr_token",token).maybeSingle();
      if(error||!data) return json({ok:false,error:"ticket_not_found"},404);
      return json({ok:true,ticket:data});
    }

    if(req.method==="GET" && url.searchParams.get("resource")==="countries"){
      await db.rpc("fobi_release_expired_reservations");
      const {data,error}=await db.from("fobi_countries")
        .select("code,name_en,name_zh,table_no,status,contestant_name,contestant_photo_url,sponsor_name,reserved_until")
        .order("table_no",{ascending:true});
      if(error) throw error;
      return json({ok:true,countries:data});
    }

    if(req.method==="GET" && url.searchParams.get("resource")==="order"){
      const orderNo=String(url.searchParams.get("order_no")||"").trim();
      if(!orderNo) return json({ok:false,error:"missing_order_no"},400);
      const {data,error}=await db.from("fobi_orders")
        .select("id,order_no,type,amount,payment_status,paid_at,created_at,ticket_count,ticket_serial_start,ticket_serial_end")
        .eq("order_no",orderNo).maybeSingle();
      if(error||!data) return json({ok:false,error:"order_not_found"},404);
      let tickets:any[]=[];
      if(data.payment_status==="paid"){
        const tr=await db.from("fobi_tickets").select("ticket_no,status,holder_name,qr_token,ticket_type,sponsor_tier,company,country_code,afterparty_entitlement").eq("order_id",data.id).order("serial_no",{ascending:true});
        if(tr.error) throw tr.error;
        tickets=tr.data||[];
      }
      const {id,...safeOrder}=data as any;
      return json({ok:true,order:safeOrder,tickets});
    }

    if(req.method==="POST"){
      const gate=await db.from("pageant_events").select("status").eq("slug","fobi-2026").maybeSingle();
      if(gate.error||!gate.data||!["open","live"].includes(gate.data.status))return json({ok:false,error:"event_closed",archive_url:"https://fobi.self.com.tw/Fobi"},410);
      const body=await req.json().catch(()=>({}));
      const contact_name=String(body?.contact_name||"").trim().slice(0,120);
      const phone=String(body?.phone||"").trim().slice(0,40);
      const email=String(body?.email||"").trim().slice(0,180);
      const note=String(body?.note||"").trim().slice(0,1000)||null;
      if(!contact_name||!phone||!email||!email.includes("@")) return json({ok:false,error:"invalid_input"},400);

      const sponsorAction = body?.action==="reserve_country" || (!body?.action && body?.type==="sponsor");
      const memberAction = body?.action==="create_member_order" || (!body?.action && body?.type==="member");

      if(sponsorAction){
        const {data,error}=await db.rpc("fobi_reserve_country",{
          p_code:String(body.country_code||""),
          p_tier:String(body.tier||"VIP 3"),
          p_company:String(body.company||""),
          p_contact_name:contact_name,
          p_phone:phone,
          p_email:email,
          p_note:note
        });
        if(error){
          const msg=String(error.message||"");
          if(msg.includes("country_unavailable")) return json({ok:false,error:"country_unavailable"},409);
          return json({ok:false,error:"reservation_failed"},400);
        }
        return json({...data,id:data?.interest_id||null});
      }

      if(memberAction){
        const {data,error}=await db.rpc("fobi_create_member_order",{
          p_member_count:Math.max(1,Math.min(20,Number(body.member_count||1))),
          p_contact_name:contact_name,
          p_phone:phone,
          p_email:email,
          p_note:note
        });
        if(error) return json({ok:false,error:"order_failed"},400);
        return json({...data,id:data?.interest_id||null});
      }

      return json({ok:false,error:"unsupported_action"},400);
    }

    return json({ok:false,error:"not_found"},404);
  }catch(err){
    console.error(err);
    return json({ok:false,error:"server_error"},500);
  }
});
