
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {motion,useInView} from 'framer-motion';
import {Crown,Globe2,UserRound,Menu,X,CalendarDays,Clock3,MapPin,Martini,ArrowRight,Ticket,ChevronDown} from 'lucide-react';
import './style.css';

const API='https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-public';
const stage='https://i0.wp.com/faceofbeautyinternational.com/wp-content/uploads/2026/02/CKN_6633.jpg?resize=1600%2C1200&ssl=1';
const queen='https://i0.wp.com/faceofbeautyinternational.com/wp-content/uploads/2026/02/599984544_18070655006622120_2305142344171806814_n-1.jpg?resize=900%2C1200&ssl=1';
const contestant='https://i0.wp.com/faceofbeautyinternational.com/wp-content/uploads/2026/03/637647404_1375377174624326_2336921487574729613_n.jpg?fit=720%2C960&ssl=1';

function Navbar(){
  const [open,setOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const fn=()=>setScrolled(window.scrollY>20);fn();window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn)},[]);
  return <header className={'topbar '+(scrolled?'isScrolled':'')}>
    <a className="logo" href="#top"><span className="logoCrest"><Crown size={24}/></span><span><b>FOBI</b><small>FACE OF BEAUTY<br/>INTERNATIONAL</small></span></a>
    <nav className={open?'nav open':'nav'}>
      <a href="#sponsor" onClick={()=>setOpen(false)}>品牌贊助</a>
      <a href="/checkout.html?type=ticket">總決賽入席</a>
      <a href="#official-exposure" onClick={()=>setOpen(false)}>合作夥伴</a>
      <a href="/event.html">活動資訊</a>
    </nav>
    <div className="navTools">
      <button className="lang"><Globe2 size={16}/>繁中<ChevronDown size={14}/></button>
      <a className="login" href="https://www.self.com.tw/auth?redirect=%2Fmember"><UserRound size={16}/>登入／註冊</a>
      <button className="menu" onClick={()=>setOpen(!open)} aria-label="選單">{open?<X/>:<Menu/>}</button>
    </div>
  </header>
}

function EventBar(){
  return <div className="eventBar">
    <div><CalendarDays/><span><b>2026.10.30（五）</b></span></div>
    <div><Clock3/><span><b>14:00 總決賽</b><small>19:00 頒獎典禮暨國際晚宴</small></span></div>
    <div><MapPin/><span><b>臺北茹曦酒店 2F</b></span></div>
    <div><Martini/><span><b>OPERA 慶功宴</b></span></div>
  </div>
}

function ActionCards(){
  const ref=useRef(null);
  const seen=useInView(ref,{once:true,margin:'-80px'});
  return <div className="actionWrap" ref={ref}>
    <motion.a href="/checkout.html?type=sponsor" className="actionCard sponsorCard" initial={{opacity:0,x:-40}} animate={seen?{opacity:1,x:0}:{}} transition={{duration:.55}}>
      <div className="cardImage"><img src={contestant} alt="FOBI 國家品牌贊助"/></div>
      <div className="cardText">
        <div className="cardTitle"><Crown/><div><h2>認領一個國家</h2><span>SPONSOR A COUNTRY</span></div></div>
        <p>40國佳麗・50席國家餐桌</p>
        <small>企業品牌 × 國際曝光 × 尊榮晚宴 × 己美／醫美版曝光</small>
        <span className="cardButton">立即認桌 <ArrowRight/></span>
      </div>
    </motion.a>
    <motion.a href="/checkout.html?type=ticket" id="final" className="actionCard ticketCard" initial={{opacity:0,x:40}} animate={seen?{opacity:1,x:0}:{}} transition={{duration:.55,delay:.08}}>
      <div className="cardText">
        <div className="cardTitle"><Ticket/><div><h2>我要參加總決賽</h2><span>JOIN THE GRAND FINAL</span></div></div>
        <p><strong>NT$3,000</strong> / 人</p>
        <small>總決賽 × 國際晚宴 × OPERA 慶功宴</small>
        <span className="cardButton pink">立即購票 <ArrowRight/></span>
      </div>
      <div className="ticketVisual"><div className="ticketMock"><Crown/><b>FOBI<br/>2026</b><small>GRAND FINAL · TAIPEI</small></div></div>
    </motion.a>
  </div>
}

function Hero(){
  const [slides,setSlides]=useState([{id:'fallback',title:'FOBI 2026 世界總決賽',subtitle:'40 COUNTRIES · ONE STAGE · ONE NIGHT',image_url:stage,link_url:'/event.html'}]);
  const [active,setActive]=useState(0);
  useEffect(()=>{fetch(API+'?resource=slides').then(r=>r.json()).then(d=>{if(d.ok&&d.items?.length)setSlides(d.items)}).catch(()=>{})},[]);
  useEffect(()=>{if(slides.length<2)return;const t=setInterval(()=>setActive(v=>(v+1)%slides.length),6000);return()=>clearInterval(t)},[slides.length]);
  const s=slides[active]||slides[0];
  return <section className="hero" id="top">
    <motion.div key={s.id||active} className="heroBg" initial={{opacity:.25,scale:1.06}} animate={{opacity:1,scale:1}} transition={{duration:1.1}}>
      <img src={s.image_url||stage} alt={s.title||'FOBI 世界美顏小姐總決賽舞台'}/>
    </motion.div>
    <div className="heroShade"/>
    <div className="particles" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{left:((i*37)%100)+'%',top:((i*53)%100)+'%',animationDelay:(i*.23)+'s'}}/>)}</div>
    <motion.figure className="queen" initial={{opacity:0,x:50}} animate={{opacity:1,x:0}} transition={{duration:1.05,delay:.12}}>
      <img src={queen} alt="FOBI 國際佳麗形象"/>
    </motion.figure>
    <div className="heroContent">
      <motion.div className="heroCopy" initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} transition={{duration:.9,delay:.18}}>
        <p className="year"><span>✦</span>2026<span>✦</span></p>
        <h1><span>FACE OF BEAUTY</span><em>INTERNATIONAL</em></h1>
        <p className="heroZh">世界美顏小姐選美總決賽</p>
        <p className="tagline">40 COUNTRIES <b>|</b> ONE STAGE <b>|</b> ONE NIGHT</p>
        <p className="subline">{s.subtitle||'全球佳麗・於臺北・遇見更美的世界'}</p>
        <p className="scriptLine">Beauty for a Better World</p>
      </motion.div>
    </div>
    <div className="heroDots" aria-label="Hero 輪播">{slides.map((x,i)=><button key={x.id||i} className={i===active?'active':''} onClick={()=>setActive(i)} aria-label={'第 '+(i+1)+' 張'}/>)}</div>
    <ActionCards/>
    <EventBar/>
  </section>
}

function ExposureDirectory(){
  const[sponsors,setSponsors]=useState([]),[participants,setParticipants]=useState([]);
  useEffect(()=>{Promise.all([fetch(API+'?resource=sponsors').then(r=>r.json()),fetch(API+'?resource=participants').then(r=>r.json())]).then(([s,p])=>{if(s.ok)setSponsors(s.items||[]);if(p.ok)setParticipants(p.items||[])}).catch(()=>{})},[]);
  return <section className="directorySection" id="official-exposure">
    <div className="sectionHead"><p className="sectionEyebrow">OFFICIAL EXPOSURE</p><h2>贊助夥伴與參與貴賓</h2><p>FOBI 官網提供合作品牌卡片曝光，並以頭像方式呈現參與會員／貴賓；內容由活動後台統一管理。</p></div>
    {sponsors.length?<div className="sponsorCards">{sponsors.map(s=><a className="sponsorProfile" href={s.website_url||'#'} key={s.id} target={s.website_url?'_blank':undefined} rel="noreferrer"><div className="sponsorLogo">{s.logo_url?<img src={s.logo_url} alt={s.name}/>:<Crown/>}</div><div><small>{s.tier||'PARTNER'}</small><h3>{s.name}</h3><p>{s.description||'FOBI 2026 官方合作夥伴'}</p></div></a>)}</div>:<div className="directoryEmpty"><Crown/><div><b>官方贊助夥伴</b><p>品牌名錄將由活動後台陸續公開。</p><a href="/checkout.html?type=sponsor">成為 FOBI 贊助夥伴 →</a></div></div>}
    {participants.length?<div className="participantStrip">{participants.map(p=><a className="participant" href={p.profile_url||'#'} key={p.id}><span>{p.avatar_url?<img src={p.avatar_url} alt={p.display_name}/>:<UserRound/>}</span><b>{p.display_name}</b><small>{p.subtitle||''}</small></a>)}</div>:<div className="directoryEmpty"><UserRound/><div><b>參與會員／貴賓</b><p>經同意公開的參與者頭像與連結將顯示於此。</p></div></div>}
  </section>
}

function Count({value,label}){
  const ref=useRef(null);
  const active=useInView(ref,{once:true});
  const [n,setN]=useState(0);
  useEffect(()=>{if(!active)return;let v=0;const timer=setInterval(()=>{v+=Math.max(1,Math.ceil(value/24));if(v>=value){v=value;clearInterval(timer)}setN(v)},38);return()=>clearInterval(timer)},[active,value]);
  return <div className="stat" ref={ref}><b>{n}</b><span>{label}</span></div>
}

function Highlights(){
  return <section className="highlights" id="highlights">
    <p className="sectionEyebrow">FOBI 2026 · TAIPEI</p>
    <div className="stats"><Count value={40} label="國家代表"/><Count value={50} label="國家餐桌"/><Count value={1} label="世界總決賽之夜"/><Count value={3} label="核心活動節點"/></div>
  </section>
}

function Sponsor(){
  const data=[
    ['VIP 1','NT$70,000','國際旗艦贊助','國家桌・OPERA 慶功宴・己美 SELF 與醫美版延伸曝光'],
    ['VIP 2','NT$60,000','品牌尊榮贊助','國家桌・After Party・社群與會員曝光'],
    ['VIP 3','NT$40,000','國家桌品牌贊助','國家桌・現場品牌識別・活動內容露出']
  ];
  return <section className="sponsorSection" id="sponsor"><div className="sectionHead"><p className="sectionEyebrow">SPONSOR A COUNTRY</p><h2>讓品牌代表一個國家入席。</h2><p>FOBI 國家桌不是單純餐席，而是結合國際舞台、企業貴賓接待、己美 SELF 會員與醫美版社群曝光的品牌合作方案。</p></div><div className="tierGrid">{data.map((item,index)=><motion.article key={item[0]} className={'tier '+(index===0?'featured':'')} whileHover={{y:-6}} transition={{duration:.3}}><span>{item[0]}</span><h3>{item[2]}</h3><b>{item[1]}</b><p>{item[3]}</p><a href={'/checkout.html?type=sponsor&tier='+encodeURIComponent(item[0])}>立即認桌 <ArrowRight/></a></motion.article>)}</div></section>
}

function Footer(){
  return <footer id="footer"><div><b>FOBI 2026</b><small>FACE OF BEAUTY INTERNATIONAL · TAIPEI</small></div><div className="footerLinks"><a href="/contestants.html">40國佳麗</a><a href="/sponsors.html">品牌合作</a><a href="/checkout.html?type=ticket">總決賽入席</a><a href="/pageants.html">更多選美賽事</a></div><span>2026.10.30 · 臺北茹曦酒店 2F</span></footer>
}

function App(){
  return <><Navbar/><main><Hero/><Highlights/><section className="about" id="about"><p className="sectionEyebrow">BEAUTY FOR A BETTER WORLD</p><h2>一個舞台，四十個國家。<br/>一場屬於臺北的國際盛會。</h2><p>FOBI 2026 串聯參賽者、企業贊助、己美 SELF 會員與全球選美活動，以精品時尚的數位體驗完成認桌、入席與後續互動。</p></section><Sponsor/><ExposureDirectory/></main><Footer/></>
}

createRoot(document.getElementById('root')).render(<App/>);
