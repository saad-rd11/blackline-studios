import { useState, useEffect, useRef } from "react";
import {
  Zap, Sparkles, Map, Box, Skull, Wind, Building, Gamepad2, Rocket, Bug, Pencil,
  ChevronRight, ChevronLeft, Check, X, Send, Copy, Lock, Eye, EyeOff,
  ArrowRight, Ban, Calendar, Clock, Leaf, Flame, Bolt, Star, Trophy, Users,
  DollarSign, LayoutDashboard, Ticket, TrendingUp, LogOut, Plus, Trash2,
  ChevronUp, ChevronDown, Layers, Package, Image, Search, ExternalLink,
} from "lucide-react";
import {
  getConfig, setConfigItems, setSettings,
  subscribeOrders, createOrder, patchOrder,
} from "./db";
import { auth } from "./firebase";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "firebase/auth";

const C = {
  bg:"#060610", s0:"rgba(255,255,255,0.02)", s1:"rgba(255,255,255,0.045)", s2:"rgba(255,255,255,0.07)",
  b0:"rgba(255,255,255,0.06)", b1:"rgba(255,255,255,0.12)", b2:"rgba(255,255,255,0.2)",
  p:"#5865f2", pBg:"rgba(88,101,242,0.14)", pBd:"rgba(88,101,242,0.38)",
  a:"#00d4ff", aBg:"rgba(0,212,255,0.11)",
  gold:"#ffd93d", goldBg:"rgba(255,217,61,0.11)",
  gr:"#4ade80", grBg:"rgba(74,222,128,0.11)",
  pu:"#c084fc", puBg:"rgba(192,132,252,0.11)",
  re:"#f87171", reBg:"rgba(248,113,113,0.11)",
  or:"#fb923c",
  tx:"#eaeaf5", mu:"rgba(234,234,245,0.45)", di:"rgba(234,234,245,0.22)",
};

const COMPL = [
  { id:"simple",  lbl:"Simple",  mul:1.0, tag:"1×",   hint:"Minimal features" },
  { id:"medium",  lbl:"Medium",  mul:1.5, tag:"1.5×", hint:"Standard scope" },
  { id:"complex", lbl:"Complex", mul:2.3, tag:"2.3×", hint:"Advanced mechanics" },
  { id:"premium", lbl:"Premium", mul:3.8, tag:"3.8×", hint:"Max quality" },
];
const TIMELINES = [
  { id:"flexible", Icon:Leaf,  lbl:"Flexible", sub:"2+ weeks",  mul:1.0,  fee:null },
  { id:"standard", Icon:Clock, lbl:"Standard", sub:"1–2 weeks", mul:1.0,  fee:null },
  { id:"priority", Icon:Bolt,  lbl:"Priority", sub:"3–7 days",  mul:1.35, fee:"+35%" },
  { id:"rush",     Icon:Flame, lbl:"Rush",     sub:"1–3 days",  mul:1.75, fee:"+75%" },
];
const STATUS = {
  pending:     { lbl:"Pending Review", col:C.gold, bg:C.goldBg },
  confirmed:   { lbl:"Confirmed",      col:C.a,    bg:C.aBg    },
  in_progress: { lbl:"In Progress",    col:C.p,    bg:C.pBg    },
  review:      { lbl:"In Review",      col:C.pu,   bg:C.puBg   },
  completed:   { lbl:"Completed",      col:C.gr,   bg:C.grBg   },
  cancelled:   { lbl:"Cancelled",      col:C.re,   bg:C.reBg   },
};
const STATUS_FLOW = { pending:"confirmed", confirmed:"in_progress", in_progress:"review", review:"completed" };

const ICON_MAP = { Zap, Wind, Skull, Box, Map, Bolt, Rocket, Building, Bug, Pencil, Gamepad2, Flame, Trophy, Star, Search };
const ICON_KEYS = Object.keys(ICON_MAP);

const GRADS = [
  ["#5865f2","#00d4ff"],["#c084fc","#5865f2"],["#00d4ff","#4ade80"],
  ["#ffd93d","#fb923c"],["#4ade80","#00d4ff"],["#f87171","#c084fc"],
  ["#fb923c","#f87171"],["#4ade80","#5865f2"],
];

const DEF_TYPES = [
  { id:"bug_fix",    iconKey:"Bug",      lbl:"Bug Fix / Edit",        base:75,   dur:1,  desc:"Minor fixes, tweaks, adjustments",          active:true },
  { id:"map_edit",   iconKey:"Pencil",   lbl:"Map Edit / Revamp",     base:200,  dur:3,  desc:"Updates to an existing map",                active:true },
  { id:"prop_hunt",  iconKey:"Search",   lbl:"Prop Hunt",             base:350,  dur:5,  desc:"Full prop hunt with hiding mechanics",       active:true },
  { id:"deathrun",   iconKey:"Skull",    lbl:"Deathrun",              base:400,  dur:6,  desc:"Multi-stage obstacle course",               active:true },
  { id:"box_fight",  iconKey:"Box",      lbl:"Box Fight Zone",        base:280,  dur:4,  desc:"1v1 or team box fighting arena",            active:true },
  { id:"zone_wars",  iconKey:"Wind",     lbl:"Zone Wars",             base:380,  dur:5,  desc:"Custom zone wars experience",               active:true },
  { id:"puzzle_adv", iconKey:"Map",      lbl:"Puzzle / Adventure",    base:650,  dur:8,  desc:"Story-driven or puzzle map",                active:true },
  { id:"custom_map", iconKey:"Building", lbl:"Custom Creative Map",   base:900,  dur:10, desc:"Fully custom-designed map",                 active:true },
  { id:"uefn_mode",  iconKey:"Gamepad2", lbl:"Custom UEFN Mode",      base:1400, dur:14, desc:"Scripted game mode using Verse",            active:true },
  { id:"full_exp",   iconKey:"Rocket",   lbl:"Full UEFN Experience",  base:3000, dur:21, desc:"Publication-ready UEFN project",           active:true },
];
const DEF_ADDONS = [
  { id:"hud",   lbl:"Custom HUD / UI",          price:150, active:true },
  { id:"npc",   lbl:"NPC / AI Behavior",         price:250, active:true },
  { id:"biome", lbl:"Extra Biome / Area",        price:200, active:true },
  { id:"audio", lbl:"Custom Audio / SFX",        price:120, active:true },
  { id:"verse", lbl:"Advanced Verse Scripting",  price:350, active:true },
  { id:"optim", lbl:"Performance Optimization",  price:100, active:true },
];
const DEF_PORTFOLIO = [
  { id:"p1", order:0, visible:true, cat:"Maps",   title:"Neon District Zone Wars",  code:"1234-5678-9012", plays:"412K", rating:4.9, grad:["#5865f2","#00d4ff"], iconKey:"Wind"    },
  { id:"p2", order:1, visible:true, cat:"Maps",   title:"Skyfall Deathrun X",       code:"2345-6789-0123", plays:"288K", rating:4.8, grad:["#c084fc","#5865f2"], iconKey:"Skull"   },
  { id:"p3", order:2, visible:true, cat:"Verse",  title:"Custom Loadout System",    code:"3456-7890-1234", plays:"156K", rating:5.0, grad:["#00d4ff","#4ade80"], iconKey:"Gamepad2"},
  { id:"p4", order:3, visible:true, cat:"Fights", title:"Pro Box Fight Arena",      code:"4567-8901-2345", plays:"531K", rating:4.9, grad:["#ffd93d","#fb923c"], iconKey:"Box"     },
  { id:"p5", order:4, visible:true, cat:"Maps",   title:"Lost Temple Adventure",    code:"5678-9012-3456", plays:"97K",  rating:4.7, grad:["#4ade80","#00d4ff"], iconKey:"Map"     },
];
const Q_BLANK = { type:"", complexity:"medium", timeline:"standard", addons:[] };
const C_BLANK  = { discord:"", email:"", desc:"", notes:"" };

const fmt   = n  => `$${Math.round(n).toLocaleString()}`;
const fmtD  = ts => {
  if (!ts) return "\u2014";
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
};
const genId = () => `UEFN-${Math.random().toString(36).slice(2,10).toUpperCase()}`;
const nid   = ()  => Math.random().toString(36).slice(2,8);

function calcPrice(quiz, types, addons) {
  const t  = types.find(x => x.id === quiz.type);
  const c  = COMPL.find(x => x.id === quiz.complexity);
  const tl = TIMELINES.find(x => x.id === quiz.timeline);
  if (!t || !c || !tl) return null;
  const addTotal  = (quiz.addons||[]).reduce((s,id)=>s+(addons.find(a=>a.id===id)?.price||0),0);
  const base      = t.base;
  const withCompl = Math.round(base * c.mul / 25) * 25;
  const withRush  = Math.round(withCompl * tl.mul / 25) * 25;
  const total     = Math.round((withRush + addTotal) / 25) * 25;
  return { min:total, max:Math.round(total*1.2/25)*25, base, withCompl, withRush, addTotal, tl, t, c };
}

const Pill = ({label,col,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",background:bg,color:col,border:`1px solid ${col}33`}}>{label}</span>
);
const IBtn = ({onClick,children,col=C.mu,title}) => (
  <button onClick={onClick} title={title} style={{background:"none",border:"none",color:col,cursor:"pointer",padding:4,display:"flex",alignItems:"center",borderRadius:5}}>{children}</button>
);
const InlineInput = ({value,onChange,type="text",min,style={}}) => (
  <input type={type} value={value} onChange={onChange} min={min}
    style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.b0}`,borderRadius:6,color:C.tx,fontSize:13,padding:"5px 9px",outline:"none",width:"100%",...style}}
    onFocus={e=>e.target.style.borderColor=C.p} onBlur={e=>e.target.style.borderColor=C.b0}/>
);

export default function App() {
  const [view, setView]         = useState("studio");
  const [bookingOpen, setBooking] = useState(true);

  const [types,  _setTypes]   = useState(DEF_TYPES);
  const [addons, _setAddons]  = useState(DEF_ADDONS);
  const [portfolio, _setPort] = useState(DEF_PORTFOLIO);
  const [orders, _setOrders]  = useState([]);

  const [loaded, setLoaded] = useState(false);

  const [quizStep, setQuizStep] = useState(1);
  const [quiz, setQuiz]         = useState(Q_BLANK);
  const [contact, setContact]   = useState(C_BLANK);
  const [submitted, setSubmitted] = useState(null);

  const [cycleIdx, setCycleIdx] = useState(0);

  const [trackId, setTrackId] = useState("");
  const [tracked, setTracked] = useState(undefined);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPass, setSignInPass] = useState("");
  const [signInErr, setSignInErr] = useState("");

  const [dashTab, setDashTab] = useState("orders");

  const [showNewPort, setShowNewPort] = useState(false);
  const [newPort, setNewPort] = useState({title:"",cat:"",code:"",plays:"",rating:"5.0",iconKey:"Wind",gradIdx:0,imageUrl:""});
  const [showNewAddon, setShowNewAddon] = useState(false);
  const [newAddon, setNewAddon] = useState({lbl:"",price:""});
  const [showNewType, setShowNewType] = useState(false);
  const [newType, setNewType] = useState({lbl:"",iconKey:"Zap",base:"",dur:"",desc:""});
  const [portUrlEdit, setPortUrlEdit] = useState(null);

  const quizRef = useRef(null);

  const setTypes  = async v => { _setTypes(v);   await setConfigItems("services", v); };
  const setAddons = async v => { _setAddons(v);  await setConfigItems("addons", v); };
  const setPort   = async v => { _setPort(v);    await setConfigItems("portfolio", v); };
  const setBookingP = async v => { setBooking(v); await setSettings({ bookingOpen: v }); };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    (async () => {
      try {
        const [typesRaw, addonsRaw, portRaw, settingsRaw] = await Promise.all([
          getConfig("services",  { items: DEF_TYPES }),
          getConfig("addons",    { items: DEF_ADDONS }),
          getConfig("portfolio", { items: DEF_PORTFOLIO }),
          getConfig("settings",  { bookingOpen: true }),
        ]);
        if (typesRaw.items)  _setTypes(typesRaw.items);
        if (addonsRaw.items) _setAddons(addonsRaw.items);
        if (portRaw.items)   _setPort(portRaw.items);
        if (settingsRaw.bookingOpen !== undefined) setBooking(settingsRaw.bookingOpen);

        subscribeOrders(_setOrders);
      } catch {}
      setLoaded(true);
    })();
    return () => unsubAuth();
  }, []);

  const visPort = [...portfolio].filter(p=>p.visible).sort((a,b)=>a.order-b.order);
  useEffect(() => {
    if (visPort.length < 2) return;
    const t = setInterval(() => setCycleIdx(i => (i+1) % visPort.length), 4200);
    return () => clearInterval(t);
  }, [visPort.length]);

  const price = calcPrice(quiz, types, addons);
  const activeTypes  = types.filter(t => t.active);
  const activeAddons = addons.filter(a => a.active);

  function pickType(id) {
    setQuiz(q => ({...q, type:id}));
    setTimeout(() => setQuizStep(2), 190);
  }
  function pickCompl(id) {
    setQuiz(q => ({...q, complexity:id}));
    setTimeout(() => setQuizStep(3), 190);
  }
  function pickTimeline(id) {
    setQuiz(q => ({...q, timeline:id}));
    setTimeout(() => setQuizStep(4), 190);
  }
  function toggleAddon(id) {
    setQuiz(q => ({...q, addons: q.addons.includes(id) ? q.addons.filter(x=>x!==id) : [...q.addons, id]}));
  }
  async function submitOrder() {
    if (!quiz.type || !contact.discord.trim()) return;
    const orderId = genId();
    const p = price ? { min: price.min, max: price.max } : { min:0, max:0 };
    const order = {
      id: orderId, ref: orderId,
      discord: contact.discord.trim(), email: contact.email.trim(),
      type: quiz.type, complexity: quiz.complexity, timeline: quiz.timeline,
      addons: [...quiz.addons], desc: contact.desc.trim(), notes: contact.notes.trim(),
      status: "pending", price: p,
    };
    await createOrder(order);

    const newOrder = { ...order, id: orderId };
    setSubmitted(newOrder);

    try {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          discord: order.discord,
          type: quiz.type,
          complexity: quiz.complexity,
          timeline: quiz.timeline,
          price: p,
          desc: order.desc,
        }),
      });
    } catch {}
  }
  function resetQuiz() { setQuiz(Q_BLANK); setContact(C_BLANK); setSubmitted(null); setQuizStep(1); }

  async function advance(id) {
    const o = orders.find(o => o.id === id);
    if (!o || !STATUS_FLOW[o.status]) return;
    const next = STATUS_FLOW[o.status];
    await patchOrder(id, { status: next });
    _setOrders(orders.map(o => o.id === id ? { ...o, status: next } : o));
  }
  async function cancelOrd(id) {
    await patchOrder(id, { status: "cancelled" });
    _setOrders(orders.map(o => o.id === id ? { ...o, status: "cancelled" } : o));
  }

  function movePort(id, dir) {
    const sorted = [...portfolio].sort((a,b)=>a.order-b.order);
    const idx = sorted.findIndex(p=>p.id===id);
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= sorted.length) return;
    const updated = portfolio.map(p => {
      if (p.id === sorted[idx].id)  return {...p, order: sorted[nIdx].order};
      if (p.id === sorted[nIdx].id) return {...p, order: sorted[idx].order};
      return p;
    });
    setPort(updated);
  }
  function togglePortVis(id) { setPort(portfolio.map(p => p.id===id ? {...p,visible:!p.visible} : p)); }
  function removePort(id)    { setPort(portfolio.filter(p=>p.id!==id)); }
  function addPort() {
    if (!newPort.title.trim()) return;
    const maxOrder = portfolio.reduce((m,p)=>Math.max(m,p.order),0);
    setPort([...portfolio, {
      id:"p"+nid(), order:maxOrder+1, visible:true,
      cat:newPort.cat||"Maps", title:newPort.title, code:newPort.code||"0000-0000-0000",
      plays:newPort.plays||"0", rating:parseFloat(newPort.rating)||5.0,
      grad:GRADS[newPort.gradIdx]||GRADS[0], iconKey:newPort.iconKey||"Wind",
      imageUrl: newPort.imageUrl || "",
    }]);
    setNewPort({title:"",cat:"",code:"",plays:"",rating:"5.0",iconKey:"Wind",gradIdx:0,imageUrl:""});
    setShowNewPort(false);
  }
  function updatePortUrl(id, url) {
    setPort(portfolio.map(p => p.id===id ? {...p, imageUrl: url} : p));
  }

  function updateAddon(id, field, val) { setAddons(addons.map(a=>a.id===id?{...a,[field]:val}:a)); }
  function toggleAddonActive(id)       { setAddons(addons.map(a=>a.id===id?{...a,active:!a.active}:a)); }
  function removeAddon(id)             { setAddons(addons.filter(a=>a.id!==id)); }
  function addAddon() {
    if (!newAddon.lbl.trim() || !newAddon.price) return;
    setAddons([...addons, {id:"ao"+nid(), lbl:newAddon.lbl, price:+newAddon.price, active:true}]);
    setNewAddon({lbl:"",price:""}); setShowNewAddon(false);
  }

  function updateType(id, field, val) { setTypes(types.map(t=>t.id===id?{...t,[field]:val}:t)); }
  function toggleTypeActive(id)       { setTypes(types.map(t=>t.id===id?{...t,active:!t.active}:t)); }
  function removeType(id)             { setTypes(types.filter(t=>t.id!==id)); }
  function addType() {
    if (!newType.lbl.trim() || !newType.base) return;
    setTypes([...types, {id:"ty"+nid(), iconKey:newType.iconKey, lbl:newType.lbl, base:+newType.base, dur:+newType.dur||7, desc:newType.desc, active:true}]);
    setNewType({lbl:"",iconKey:"Zap",base:"",dur:"",desc:""}); setShowNewType(false);
  }

  async function handleSignIn() {
    try {
      setSignInErr("");
      await signInWithEmailAndPassword(auth, signInEmail, signInPass);
    } catch (e) {
      setSignInErr(e.message);
    }
  }

  function runTrack() {
    const q = trackId.trim().toUpperCase();
    const id = q.startsWith("UEFN-") ? q : `UEFN-${q}`;
    setTracked(orders.find(o=>o.id===id) || null);
  }
  const gridBg = { backgroundImage:`linear-gradient(${C.b0} 1px,transparent 1px),linear-gradient(90deg,${C.b0} 1px,transparent 1px)`, backgroundSize:"32px 32px" };
  const stats = { total:orders.length, active:orders.filter(o=>["confirmed","in_progress","review"].includes(o.status)).length, pending:orders.filter(o=>o.status==="pending").length, rev:orders.filter(o=>o.status==="completed").reduce((s,o)=>s+(o.price?.min||0),0) };
  const curPortItem = visPort[cycleIdx % Math.max(visPort.length,1)];

  return (
    <div style={{minHeight:"100vh",background:C.bg,...gridBg,fontFamily:"'DM Sans',sans-serif"}}>

      <div style={{position:"sticky",top:0,zIndex:50,background:`${C.bg}f0`,backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.b0}`,height:54,display:"flex",alignItems:"center",padding:"0 20px",gap:10}}>
        <div onClick={()=>{setView("studio");resetQuiz();}} style={{display:"flex",alignItems:"center",gap:8,flex:1,cursor:"pointer"}}>
          <div style={{width:28,height:28,background:`linear-gradient(135deg,${C.p},${C.a})`,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}><Zap size={15} color="#fff"/></div>
          <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,letterSpacing:2}}>UEFN STUDIO</span>
          <span style={{background:bookingOpen?C.grBg:C.reBg,color:bookingOpen?C.gr:C.re,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,border:`1px solid ${(bookingOpen?C.gr:C.re)}44`,letterSpacing:.5,animation:bookingOpen?"pulse 2.5s ease-in-out infinite":"none"}}>
            {"\u25cf"} {bookingOpen?"OPEN":"CLOSED"}
          </span>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[["studio",<Sparkles size={12}/>,"Studio"],["track",<Ticket size={12}/>,"Track Order"]].map(([v,ic,lbl])=>(
            <button key={v} onClick={()=>setView(v)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${view===v?C.pBd:"transparent"}`,background:view===v?C.pBg:"transparent",color:view===v?C.p:C.mu}}>{ic} {lbl}</button>
          ))}
          <button onClick={()=>setView("admin")} style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:28,borderRadius:8,cursor:"pointer",border:`1px solid ${view==="admin"?C.pBd:"transparent"}`,background:view==="admin"?C.pBg:"transparent",color:view==="admin"?C.p:C.di}}><Lock size={13}/></button>
        </div>
      </div>

      {!loaded && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",color:C.mu,fontSize:14}}>Loading...</div>
      )}

      {loaded && <div style={{maxWidth:980,margin:"0 auto",padding:"0 20px"}}>

        {view==="studio" && (
          <>
            <div className="fu" style={{textAlign:"center",padding:"52px 0 40px"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.s1,border:`1px solid ${C.b0}`,borderRadius:99,padding:"5px 13px",marginBottom:16,fontSize:12,color:C.mu}}>
                <Trophy size={12} color={C.gold}/> Trusted by creators {"\u00b7"} 1.6M+ plays delivered
              </div>
              <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:42,lineHeight:1.05,marginBottom:12}}>
                Custom Fortnite maps,<br/>
                <span style={{backgroundImage:`linear-gradient(90deg,${C.p},${C.a},${C.p})`,backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite"}}>Verse {"&"} game modes.</span>
              </h1>
              <p className="fu2" style={{color:C.mu,fontSize:15,maxWidth:500,margin:"0 auto 26px"}}>No DM-for-price. No back-and-forth. Answer four quick questions, see your estimate instantly, and place your order.</p>
              <div className="fu3" style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={()=>{ setView("studio"); setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50); }}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"12px 26px",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer",background:`linear-gradient(135deg,${C.p},${C.a})`,border:"none",color:"#fff",fontFamily:"inherit"}}>
                  Place an Order <ArrowRight size={15}/>
                </button>
                <button onClick={()=>setView("track")} style={{display:"flex",alignItems:"center",gap:7,padding:"12px 22px",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${C.b1}`,color:C.mu,fontFamily:"inherit"}}>
                  <Ticket size={14}/> Track existing order
                </button>
              </div>
            </div>

            {visPort.length > 0 && (
              <div style={{marginBottom:48}}>
                <div style={{display:"flex",alignItems:"center",marginBottom:16,gap:8}}>
                  <Image size={14} color={C.a}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,letterSpacing:.5}}>Recent work</span>
                  <span style={{color:C.di,fontSize:12,marginLeft:2}}>{"\u2014"} replace with your real island codes</span>
                  <div style={{flex:1}}/>
                  <div style={{display:"flex",gap:6}}>
                    <IBtn onClick={()=>setCycleIdx(i=>(i-1+visPort.length)%Math.max(visPort.length,1))}><ChevronLeft size={16}/></IBtn>
                    <IBtn onClick={()=>setCycleIdx(i=>(i+1)%Math.max(visPort.length,1))}><ChevronRight size={16}/></IBtn>
                  </div>
                </div>

                {curPortItem && (
                  <div key={`${cycleIdx}-${curPortItem.id}`} className="fu" style={{borderRadius:16,overflow:"hidden",border:`1px solid ${C.b1}`,background:C.s0}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:220}}>
                      <div style={{background:curPortItem.imageUrl ? `url(${curPortItem.imageUrl}) center/cover` : `linear-gradient(135deg,${curPortItem.grad[0]},${curPortItem.grad[1]})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:28,position:"relative"}}>
                        {!curPortItem.imageUrl && (() => { const Ic = ICON_MAP[curPortItem.iconKey]||Wind; return <Ic size={52} color="rgba(255,255,255,.9)"/>; })()}
                        <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,letterSpacing:2,color:"rgba(255,255,255,.7)",textTransform:"uppercase"}}>{curPortItem.cat}</span>
                        <div style={{position:"absolute",bottom:12,display:"flex",gap:5}}>
                          {visPort.map((_,i)=><div key={i} style={{width:i===cycleIdx%visPort.length?18:6,height:6,borderRadius:99,background:i===cycleIdx%visPort.length?"#fff":"rgba(255,255,255,.3)",transition:"all .3s"}}/>)}
                        </div>
                      </div>
                      <div style={{padding:28,display:"flex",flexDirection:"column",justifyContent:"center",gap:14}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.di,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{curPortItem.cat}</div>
                          <h3 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:26,lineHeight:1.1,marginBottom:6}}>{curPortItem.title}</h3>
                          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.mu}}>
                            <Star size={12} fill={C.gold} color={C.gold}/> <strong style={{color:C.gold}}>{curPortItem.rating.toFixed(1)}</strong> {"\u00a0\u00b7\u00a0"} <Users size={12}/> {curPortItem.plays} plays
                          </div>
                        </div>
                        <div style={{background:C.s1,borderRadius:9,padding:"10px 13px"}}>
                          <div style={{fontSize:10,fontWeight:700,color:C.di,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Island Code</div>
                          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,letterSpacing:1.5,color:C.a}}>{curPortItem.code}</div>
                        </div>
                        <button onClick={()=>quizRef.current?.scrollIntoView({behavior:"smooth",block:"start"})} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:C.pBg,border:`1px solid ${C.pBd}`,color:C.p,fontFamily:"inherit",width:"fit-content"}}>
                          Want something like this? <ArrowRight size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={quizRef} style={{scrollMarginTop:70,marginBottom:60}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
                <Sparkles size={14} color={C.p}/><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,letterSpacing:.5}}>Get your order estimate</span>
              </div>

              {quizStep < 5 && (
                <div style={{display:"flex",gap:6,marginBottom:24,justifyContent:"center"}}>
                  {[1,2,3,4].map(s=>(
                    <div key={s} style={{height:7,borderRadius:99,transition:"all .35s",background:quizStep>s?C.p:quizStep===s?C.a:"rgba(255,255,255,.08)",width:quizStep===s?28:quizStep>s?16:8}}/>
                  ))}
                </div>
              )}

              {quizStep===1 && (
                <div key="s1" className="fu">
                  <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,marginBottom:5}}>What are you building?</h2>
                  <p style={{color:C.mu,fontSize:13,marginBottom:20}}>Tap to select {"\u2014"} we'll jump to the next question automatically.</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:9}}>
                    {activeTypes.map(t=>{
                      const Ic = ICON_MAP[t.iconKey]||Zap;
                      const sel = quiz.type===t.id;
                      return (
                        <button key={t.id} onClick={()=>pickType(t.id)} style={{background:sel?C.pBg:C.s1,border:`1px solid ${sel?C.p:C.b0}`,borderRadius:13,padding:14,cursor:"pointer",display:"flex",gap:11,alignItems:"flex-start",textAlign:"left",transition:"all .15s",boxShadow:sel?`0 0 0 1px ${C.p}`:"none"}}>
                          <div style={{color:sel?C.p:C.mu,flexShrink:0,marginTop:1}}><Ic size={19}/></div>
                          <div>
                            <div style={{fontWeight:600,fontSize:13,color:C.tx,marginBottom:2}}>{t.lbl}</div>
                            <div style={{color:C.mu,fontSize:11,marginBottom:5}}>{t.desc}</div>
                            <div style={{color:C.gold,fontSize:12,fontWeight:700}}>from {fmt(t.base)}</div>
                          </div>
                          {sel && <div style={{marginLeft:"auto",color:C.p,flexShrink:0}}><Check size={15}/></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {quizStep===2 && (
                <div key="s2" className="fu">
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                    <button onClick={()=>setQuizStep(1)} style={{background:"none",border:"none",color:C.mu,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:13,fontFamily:"inherit"}}><ChevronLeft size={14}/>Back</button>
                  </div>
                  <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,marginBottom:5}}>How detailed does it need to be?</h2>
                  <p style={{color:C.mu,fontSize:13,marginBottom:20}}>This is the biggest price driver.</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
                    {COMPL.map(c=>{
                      const sel = quiz.complexity===c.id;
                      return (
                        <button key={c.id} onClick={()=>pickCompl(c.id)} style={{background:sel?C.aBg:C.s1,border:`1px solid ${sel?C.a+"88":C.b0}`,borderRadius:13,padding:16,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                          <div style={{fontWeight:700,fontSize:15,color:C.tx,marginBottom:3}}>{c.lbl}</div>
                          <div style={{color:C.mu,fontSize:11,marginBottom:7}}>{c.hint}</div>
                          <div style={{color:C.a,fontSize:14,fontWeight:700}}>{c.tag}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {quizStep===3 && (
                <div key="s3" className="fu">
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                    <button onClick={()=>setQuizStep(2)} style={{background:"none",border:"none",color:C.mu,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:13,fontFamily:"inherit"}}><ChevronLeft size={14}/>Back</button>
                  </div>
                  <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,marginBottom:5}}>How soon do you need it?</h2>
                  <p style={{color:C.mu,fontSize:13,marginBottom:20}}>Rush orders apply a multiplier to the base price.</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
                    {TIMELINES.map(({id,Icon:TlIc,lbl,sub,fee})=>{
                      const sel = quiz.timeline===id;
                      return (
                        <button key={id} onClick={()=>pickTimeline(id)} style={{background:sel?C.goldBg:C.s1,border:`1px solid ${sel?C.gold+"66":C.b0}`,borderRadius:13,padding:16,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                          <div style={{color:sel?C.gold:C.mu,marginBottom:7,display:"flex",justifyContent:"center"}}><TlIc size={18}/></div>
                          <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{lbl}</div>
                          <div style={{color:C.mu,fontSize:11,marginTop:2}}>{sub}</div>
                          {fee && <div style={{color:C.or,fontSize:11,fontWeight:700,marginTop:4}}>{fee} rush</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {quizStep===4 && (
                <div key="s4" className="fu">
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                    <button onClick={()=>setQuizStep(3)} style={{background:"none",border:"none",color:C.mu,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:13,fontFamily:"inherit"}}><ChevronLeft size={14}/>Back</button>
                  </div>
                  <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,marginBottom:5}}>Any extras?</h2>
                  <p style={{color:C.mu,fontSize:13,marginBottom:20}}>Multi-select {"\u2014"} or skip straight to your estimate.</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:9,marginBottom:20}}>
                    {activeAddons.map(a=>{
                      const on = quiz.addons.includes(a.id);
                      return (
                        <button key={a.id} onClick={()=>toggleAddon(a.id)} style={{background:on?C.grBg:C.s1,border:`1px solid ${on?C.gr+"66":C.b0}`,borderRadius:11,padding:"11px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left",transition:"all .15s"}}>
                          <div style={{width:17,height:17,borderRadius:5,background:on?C.gr:"transparent",border:`1px solid ${on?C.gr:C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{on&&<Check size={10} color="#000" strokeWidth={3}/>}</div>
                          <div><div style={{fontSize:12,fontWeight:600,color:C.tx}}>{a.lbl}</div><div style={{fontSize:11,color:C.gr,fontWeight:600}}>+{fmt(a.price)}</div></div>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={()=>setQuizStep(5)} style={{display:"flex",alignItems:"center",gap:7,padding:"12px 26px",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer",background:`linear-gradient(135deg,${C.p},${C.a})`,border:"none",color:"#fff",fontFamily:"inherit"}}>
                    See my estimate <ChevronRight size={16}/>
                  </button>
                </div>
              )}

              {quizStep===5 && price && (
                <div key="s5" className="fu">
                  <button onClick={()=>setQuizStep(1)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:C.mu,cursor:"pointer",fontSize:13,fontFamily:"inherit",marginBottom:14}}><ChevronLeft size={14}/>Reconfigure</button>

                  <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
                    {[
                      types.find(t=>t.id===quiz.type)?.lbl,
                      COMPL.find(c=>c.id===quiz.complexity)?.lbl,
                      TIMELINES.find(t=>t.id===quiz.timeline)?.lbl,
                      quiz.addons.length>0 ? `${quiz.addons.length} add-on${quiz.addons.length>1?"s":""}` : null,
                    ].filter(Boolean).map((lbl,i)=><Pill key={i} label={lbl} col={C.mu} bg={C.s1}/>)}
                  </div>

                  <div style={{background:`linear-gradient(135deg,${C.pBg},${C.aBg})`,border:`1px solid ${C.pBd}`,borderRadius:14,padding:"20px 24px",marginBottom:22}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.p,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Your estimate</div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:40,color:C.tx,marginBottom:4}}>{fmt(price.min)} {"\u2013"} {fmt(price.max)}</div>
                    <div style={{color:C.mu,fontSize:12}}>Market-rate estimate {"\u00b7"} Final price confirmed after scope review {"\u00b7"} 50% deposit to start</div>
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.pBd}`,display:"flex",flexWrap:"wrap",gap:"4px 20px"}}>
                      {[
                        [`Base (${types.find(t=>t.id===quiz.type)?.lbl})`, fmt(price.base)],
                        [`\u00d7 ${COMPL.find(c=>c.id===quiz.complexity)?.lbl}`, fmt(price.withCompl)],
                        ...(price.tl.mul>1 ? [[`Rush ${price.tl.fee}`, `+${fmt(price.withRush-price.withCompl)}`]] : []),
                        ...(price.addTotal>0 ? [["Add-ons", `+${fmt(price.addTotal)}`]] : []),
                      ].map(([k,v])=>(
                        <div key={k} style={{display:"flex",gap:6,fontSize:11,color:`${C.p}cc`}}><span>{k}</span><span style={{fontWeight:700}}>{v}</span></div>
                      ))}
                    </div>
                  </div>

                  <div style={{background:C.s0,border:`1px solid ${C.b0}`,borderRadius:14,padding:22}}>
                    <h3 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,marginBottom:4}}>Place your order</h3>
                    <p style={{color:C.mu,fontSize:13,marginBottom:18}}>Just your Discord to start {"\u2014"} everything else is optional.</p>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      <FLabel label="DISCORD USERNAME" req>
                        <InlineInput style={{fontSize:14,padding:"11px 14px"}} placeholder="@username or User#1234" value={contact.discord} onChange={e=>setContact(f=>({...f,discord:e.target.value}))}/>
                      </FLabel>
                      <FLabel label="EMAIL" opt>
                        <InlineInput type="email" style={{fontSize:14,padding:"11px 14px"}} placeholder="your@email.com" value={contact.email} onChange={e=>setContact(f=>({...f,email:e.target.value}))}/>
                      </FLabel>
                      <FLabel label="PROJECT DETAILS" opt>
                        <textarea rows={3} value={contact.desc} onChange={e=>setContact(f=>({...f,desc:e.target.value}))} placeholder="Mechanics, theme, stages, references (YouTube / island codes)\u2026"
                          style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.b0}`,borderRadius:8,color:C.tx,fontSize:14,padding:"11px 14px",width:"100%",outline:"none",resize:"vertical"}}
                          onFocus={e=>e.target.style.borderColor=C.p} onBlur={e=>e.target.style.borderColor=C.b0}/>
                      </FLabel>
                      <button disabled={!bookingOpen || !contact.discord.trim()} onClick={submitOrder}
                        style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"13px",borderRadius:9,fontSize:14,fontWeight:700,cursor:(bookingOpen&&contact.discord.trim())?"pointer":"not-allowed",background:(bookingOpen&&contact.discord.trim())?`linear-gradient(135deg,${C.p},${C.a})`:"rgba(255,255,255,.07)",border:"none",color:"#fff",fontFamily:"inherit",opacity:(bookingOpen&&contact.discord.trim())?1:.5}}>
                        {bookingOpen ? <><Send size={15}/> Place Order</> : "Bookings currently closed"}
                      </button>
                      <p style={{fontSize:11,color:C.di,textAlign:"center"}}>By submitting you confirm this is an estimate {"\u2014"} final price agreed before work begins.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view==="track" && (
          <div className="fu" style={{maxWidth:520,margin:"30px auto"}}>
            <div style={{textAlign:"center",marginBottom:22}}>
              <Ticket size={32} color={C.a} style={{marginBottom:10}}/>
              <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,marginBottom:5}}>Track your order</h2>
              <p style={{color:C.mu,fontSize:14}}>No account needed. Paste your Order ID.</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:18}}>
              <input value={trackId} onChange={e=>setTrackId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runTrack()} placeholder="UEFN-XXXXXXXX"
                style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${C.b0}`,borderRadius:8,color:C.tx,fontSize:15,padding:"11px 14px",outline:"none",fontFamily:"'Rajdhani',sans-serif",letterSpacing:1}}
                onFocus={e=>e.target.style.borderColor=C.p} onBlur={e=>e.target.style.borderColor=C.b0}/>
              <button onClick={runTrack} style={{padding:"0 20px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",background:C.p,border:"none",color:"#fff",fontFamily:"inherit"}}>Track</button>
            </div>
            {tracked===null && <div style={{textAlign:"center",color:C.mu,fontSize:13,padding:"20px 0"}}>No order found. Double-check your ID.</div>}
            {tracked && (() => {
              const ti=types.find(t=>t.id===tracked.type); const st=STATUS[tracked.status]||STATUS.pending;
              const steps=["pending","confirmed","in_progress","review","completed"]; const idx=steps.indexOf(tracked.status);
              return (
                <div className="fu" style={{background:C.s1,border:`1px solid ${C.b0}`,borderRadius:13,padding:20}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:18,letterSpacing:.5}}>{tracked.id}</span>
                    <Pill label={st.lbl} col={st.col} bg={st.bg}/>
                  </div>
                  {tracked.status!=="cancelled" && (
                    <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
                      {steps.map((s,i)=>(
                        <div key={s} style={{flex:i<steps.length-1?1:0,display:"flex",alignItems:"center"}}>
                          <div style={{width:10,height:10,borderRadius:99,background:i<=idx?(STATUS[s]?.col||C.p):"rgba(255,255,255,.1)",flexShrink:0}}/>
                          {i<steps.length-1&&<div style={{flex:1,height:2,background:i<idx?C.b1:"rgba(255,255,255,.08)"}}/>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:13}}>
                    {[["Project",ti?.lbl],["Estimate",tracked.price?`${fmt(tracked.price.min)}\u2013${fmt(tracked.price.max)}`:"TBD"],["Complexity",COMPL.find(c=>c.id===tracked.complexity)?.lbl],["Placed",fmtD(tracked.createdAt)]].map(([k,v])=>(
                      <div key={k}><div style={{fontSize:10,fontWeight:700,color:C.di,letterSpacing:.8,textTransform:"uppercase",marginBottom:2}}>{k}</div><div style={{fontWeight:600,color:C.tx}}>{v||"\u2014"}</div></div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {view==="admin" && !authLoading && (
          user ? (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,justifyContent:"flex-end"}}>
                <span style={{fontSize:11,color:C.di}}>{user.email}</span>
                <button onClick={()=>signOut(auth)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${C.b0}`,color:C.mu,fontFamily:"inherit"}}><LogOut size={13}/> Log out</button>
              </div>
              <AdminPanel
                orders={orders} types={types} addons={addons} portfolio={portfolio} bookingOpen={bookingOpen}
                setBookingP={setBookingP} advance={advance} cancelOrd={cancelOrd}
                setDashTab={setDashTab} dashTab={dashTab}
                movePort={movePort} togglePortVis={togglePortVis} removePort={removePort}
                updatePortUrl={updatePortUrl} portUrlEdit={portUrlEdit} setPortUrlEdit={setPortUrlEdit}
                showNewPort={showNewPort} setShowNewPort={setShowNewPort} newPort={newPort} setNewPort={setNewPort}
                addPort={addPort} showNewAddon={showNewAddon} setShowNewAddon={setShowNewAddon}
                newAddon={newAddon} setNewAddon={setNewAddon} addAddon={addAddon}
                updateAddon={updateAddon} toggleAddonActive={toggleAddonActive} removeAddon={removeAddon}
                showNewType={showNewType} setShowNewType={setShowNewType}
                newType={newType} setNewType={setNewType} addType={addType}
                updateType={updateType} toggleTypeActive={toggleTypeActive} removeType={removeType}
              />
            </div>
          ) : (
            <div className="fu" style={{maxWidth:340,margin:"50px auto",textAlign:"center"}}>
              <Lock size={28} color={C.p} style={{marginBottom:12}}/>
              <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22,marginBottom:6}}>Owner sign in</h2>
              <p style={{color:C.mu,fontSize:13,marginBottom:18}}>Sign in with the owner Firebase Auth account.</p>
              <input type="email" value={signInEmail} onChange={e=>{setSignInEmail(e.target.value);setSignInErr("");}} placeholder="Email"
                style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.b0}`,borderRadius:8,color:C.tx,fontSize:14,padding:"11px 14px",outline:"none",marginBottom:8,textAlign:"center"}}/>
              <input type="password" value={signInPass} onChange={e=>{setSignInPass(e.target.value);setSignInErr("");}} onKeyDown={e=>e.key==="Enter"&&handleSignIn()} placeholder="Password"
                style={{width:"100%",background:"rgba(255,255,255,.04)",border:`1px solid ${C.b0}`,borderRadius:8,color:C.tx,fontSize:14,padding:"11px 14px",outline:"none",marginBottom:8,textAlign:"center"}}/>
              {signInErr && <div style={{color:C.re,fontSize:12,marginBottom:8}}>{signInErr}</div>}
              <button onClick={handleSignIn} style={{width:"100%",padding:11,borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",background:C.p,border:"none",color:"#fff",fontFamily:"inherit"}}>Sign in</button>
            </div>
          )
        )}
      </div>}

      {submitted && (
        <div style={{position:"fixed",inset:0,zIndex:90,background:"rgba(3,3,14,.84)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="fu" style={{width:"100%",maxWidth:400,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:16,padding:"30px 26px",textAlign:"center"}}>
            <div style={{width:56,height:56,borderRadius:99,background:C.grBg,border:`1px solid ${C.gr}44`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Check size={26} color={C.gr} strokeWidth={3}/></div>
            <h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:24,marginBottom:6}}>Order placed!</h2>
            <p style={{color:C.mu,fontSize:14,marginBottom:20}}>I'll DM you on Discord to confirm the scope and final price.</p>
            <div style={{background:C.s1,border:`1px solid ${C.b0}`,borderRadius:11,padding:"14px 18px",marginBottom:18}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:C.di,textTransform:"uppercase",marginBottom:4}}>Your Order ID</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:26,color:C.p,letterSpacing:1}}>{submitted.id}</span>
                <IBtn onClick={()=>{try{navigator.clipboard.writeText(submitted.id);}catch{}}}><Copy size={14}/></IBtn>
              </div>
              <div style={{fontSize:11,color:C.di,marginTop:3}}>Paste this into Track Order anytime to check status</div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>{setView("track");setTrackId(submitted.id);setTracked(orders.find(o=>o.id===submitted.id));resetQuiz();}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:11,borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:C.p,border:"none",color:"#fff",fontFamily:"inherit"}}><Ticket size={14}/> Track order</button>
              <button onClick={resetQuiz} style={{flex:1,padding:11,borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${C.b0}`,color:C.mu,fontFamily:"inherit"}}>Another order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({
  orders, types, addons, portfolio, bookingOpen, setBookingP,
  advance, cancelOrd, dashTab, setDashTab,
  movePort, togglePortVis, removePort, updatePortUrl, portUrlEdit, setPortUrlEdit,
  showNewPort, setShowNewPort, newPort, setNewPort, addPort,
  showNewAddon, setShowNewAddon, newAddon, setNewAddon, addAddon,
  updateAddon, toggleAddonActive, removeAddon,
  showNewType, setShowNewType, newType, setNewType, addType,
  updateType, toggleTypeActive, removeType,
}) {
  const stats = {
    total: orders.length,
    active: orders.filter(o=>["confirmed","in_progress","review"].includes(o.status)).length,
    pending: orders.filter(o=>o.status==="pending").length,
    rev: orders.filter(o=>o.status==="completed").reduce((s,o)=>s+(o.price?.min||0),0),
  };

  return (
    <div className="fu" style={{paddingTop:24,paddingBottom:40}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <div style={{flex:1}}><h2 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:22}}>Owner Dashboard</h2></div>
        <button onClick={()=>setBookingP(!bookingOpen)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:bookingOpen?C.grBg:C.reBg,color:bookingOpen?C.gr:C.re,border:`1px solid ${(bookingOpen?C.gr:C.re)}44`}}>
          {bookingOpen?<Eye size={13}/>:<EyeOff size={13}/>}{bookingOpen?"Open":"Closed"}
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:18}}>
        {[[orders.length,"Orders",C.tx,<LayoutDashboard size={14}/>],[stats.active,"Active",C.p,<TrendingUp size={14}/>],[stats.pending,"Pending",C.gold,<Clock size={14}/>],[`$${stats.rev.toLocaleString()}`,"Revenue",C.gr,<DollarSign size={14}/>]].map(([v,k,col,ic])=>(
          <div key={k} style={{background:C.s1,border:`1px solid ${C.b0}`,borderRadius:11,padding:"12px 14px"}}>
            <div style={{color:C.mu,marginBottom:5}}>{ic}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:20,color:col}}>{v}</div>
            <div style={{fontSize:11,color:C.mu}}>{k}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:4,marginBottom:18,borderBottom:`1px solid ${C.b0}`}}>
        {[["orders","Orders",<LayoutDashboard size={12}/>],["portfolio","Portfolio",<Image size={12}/>],["addons","Add-ons",<Package size={12}/>],["services","Services",<Layers size={12}/>]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setDashTab(id)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 13px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:"none",border:"none",color:dashTab===id?C.tx:C.mu,borderBottom:`2px solid ${dashTab===id?C.p:"transparent"}`,marginBottom:-1}}>{ic}{lbl}</button>
        ))}
      </div>

      {dashTab==="orders" && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {orders.length===0&&<div style={{textAlign:"center",color:C.di,padding:30,fontSize:13}}>No orders yet.</div>}
          {orders.map(o=>{
            const ti=types.find(t=>t.id===o.type); const st=STATUS[o.status]||STATUS.pending; const nxt=STATUS_FLOW[o.status];
            return (
              <div key={o.id} style={{background:C.s0,border:`1px solid ${C.b0}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{color:C.mu,flexShrink:0}}>{(() => { const Ic=ICON_MAP[ti?.iconKey]||Zap; return <Ic size={18}/>; })()}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:14,letterSpacing:.5}}>{o.id}</span><Pill label={st.lbl} col={st.col} bg={st.bg}/></div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {[["\ud83d\udc64",o.discord],["\ud83c\udfae",ti?.lbl],["\ud83d\udcc5",fmtD(o.createdAt)]].map(([ic,v])=>(<span key={ic+v} style={{color:C.mu,fontSize:11}}>{ic} {v}</span>))}
                  </div>
                  {o.desc&&<div style={{color:C.di,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2}}>{o.desc}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:13,color:C.gold,marginBottom:5}}>{o.price?`${fmt(o.price.min)}\u2013${fmt(o.price.max)}`:"TBD"}</div>
                  <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                    {nxt&&<button onClick={()=>advance(o.id)} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",background:STATUS[nxt].bg,color:STATUS[nxt].col,border:`1px solid ${STATUS[nxt].col}44`,fontFamily:"inherit"}}><ArrowRight size={9}/> {STATUS[nxt].lbl}</button>}
                    {!["cancelled","completed"].includes(o.status)&&<button onClick={()=>cancelOrd(o.id)} style={{display:"flex",alignItems:"center",padding:"3px 6px",borderRadius:5,fontSize:11,cursor:"pointer",background:C.reBg,color:C.re,border:`1px solid ${C.re}44`,fontFamily:"inherit"}}><Ban size={10}/></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dashTab==="portfolio" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{color:C.mu,fontSize:13}}>Drag order controls affect the carousel cycle. You can paste an image URL for any sample (host on imgbb, imgur, etc.).</p>
            <button onClick={()=>setShowNewPort(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:C.pBg,border:`1px solid ${C.pBd}`,color:C.p,fontFamily:"inherit"}}><Plus size={13}/> Add Sample</button>
          </div>

          {showNewPort && (
            <div style={{background:C.s1,border:`1px solid ${C.pBd}`,borderRadius:12,padding:18,marginBottom:14}}>
              <h4 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:16,marginBottom:12}}>New portfolio sample</h4>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {[["Title","title","text"],["Category","cat","text"],["Island Code","code","text"],["Plays (e.g. 412K)","plays","text"],["Rating (0\u20135)","rating","text"],["Image URL (optional)","imageUrl","url"]].map(([lbl,field,type])=>(
                  <div key={field}><div style={{fontSize:11,color:C.di,marginBottom:4,letterSpacing:.3,fontWeight:600,textTransform:"uppercase"}}>{lbl}</div>
                    <InlineInput type={type} value={newPort[field]} onChange={e=>setNewPort(f=>({...f,[field]:e.target.value}))}/></div>
                ))}
                <div><div style={{fontSize:11,color:C.di,marginBottom:4,letterSpacing:.3,fontWeight:600,textTransform:"uppercase"}}>Icon</div>
                  <select value={newPort.iconKey} onChange={e=>setNewPort(f=>({...f,iconKey:e.target.value}))} style={{background:"rgba(255,255,255,.05)",border:`1px solid ${C.b0}`,borderRadius:6,color:C.tx,fontSize:13,padding:"5px 9px",width:"100%"}}>
                    {ICON_KEYS.map(k=><option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:C.di,marginBottom:6,letterSpacing:.3,fontWeight:600,textTransform:"uppercase"}}>Gradient</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {GRADS.map((g,i)=>(
                    <div key={i} onClick={()=>setNewPort(f=>({...f,gradIdx:i}))} style={{width:32,height:22,borderRadius:6,background:`linear-gradient(135deg,${g[0]},${g[1]})`,cursor:"pointer",border:`2px solid ${newPort.gradIdx===i?"#fff":"transparent"}`,transition:"border-color .15s"}}/>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addPort} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:C.p,border:"none",color:"#fff",fontFamily:"inherit"}}>Add</button>
                <button onClick={()=>setShowNewPort(false)} style={{padding:"8px 14px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${C.b0}`,color:C.mu,fontFamily:"inherit"}}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[...portfolio].sort((a,b)=>a.order-b.order).map(p=>{
              const Ic=ICON_MAP[p.iconKey]||Wind;
              const editing = portUrlEdit === p.id;
              return (
                <div key={p.id} style={{background:C.s0,border:`1px solid ${C.b0}`,borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",gap:12,opacity:p.visible?1:.5}}>
                  <div style={{width:36,height:36,borderRadius:8,background:p.imageUrl ? `url(${p.imageUrl}) center/cover` : `linear-gradient(135deg,${p.grad[0]},${p.grad[1]})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {!p.imageUrl && <Ic size={16} color="rgba(255,255,255,.9)"/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:C.tx,marginBottom:1}}>{p.title}</div>
                    <div style={{fontSize:11,color:C.mu}}>{p.cat} {"\u00b7"} {p.code} {"\u00b7"} {p.plays} plays</div>
                    {editing ? (
                      <div style={{display:"flex",gap:4,marginTop:4}}>
                        <input type="url" defaultValue={p.imageUrl||""} placeholder="https://..." onBlur={e=>{updatePortUrl(p.id,e.target.value);setPortUrlEdit(null);}} autoFocus
                          style={{flex:1,background:"rgba(255,255,255,.05)",border:`1px solid ${C.b0}`,borderRadius:4,color:C.tx,fontSize:11,padding:"3px 6px",outline:"none"}}
                          onKeyDown={e=>e.key==="Enter"&&e.target.blur()}/>
                      </div>
                    ) : p.imageUrl && (
                      <div style={{fontSize:10,color:C.a,marginTop:2,display:"flex",alignItems:"center",gap:3}}>
                        <ExternalLink size={10}/> has image
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    <IBtn onClick={()=>setPortUrlEdit(editing?null:p.id)} col={C.a} title="Image URL"><Image size={13}/></IBtn>
                    <IBtn onClick={()=>movePort(p.id,-1)} title="Move up"><ChevronUp size={14}/></IBtn>
                    <IBtn onClick={()=>movePort(p.id,1)} title="Move down"><ChevronDown size={14}/></IBtn>
                    <IBtn onClick={()=>togglePortVis(p.id)} title={p.visible?"Hide":"Show"} col={p.visible?C.a:C.di}>{p.visible?<Eye size={14}/>:<EyeOff size={14}/>}</IBtn>
                    <IBtn onClick={()=>removePort(p.id)} col={C.re} title="Delete"><Trash2 size={14}/></IBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dashTab==="addons" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{color:C.mu,fontSize:13}}>Changes are live immediately {"\u2014"} active add-ons appear in the quiz.</p>
            <button onClick={()=>setShowNewAddon(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:C.pBg,border:`1px solid ${C.pBd}`,color:C.p,fontFamily:"inherit"}}><Plus size={13}/> Add</button>
          </div>
          {showNewAddon && (
            <div style={{background:C.s1,border:`1px solid ${C.pBd}`,borderRadius:11,padding:14,marginBottom:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{flex:2,minWidth:140}}><div style={{fontSize:11,color:C.di,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>Label</div><InlineInput value={newAddon.lbl} onChange={e=>setNewAddon(f=>({...f,lbl:e.target.value}))}/></div>
              <div style={{flex:1,minWidth:90}}><div style={{fontSize:11,color:C.di,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>Price $</div><InlineInput type="number" min="0" value={newAddon.price} onChange={e=>setNewAddon(f=>({...f,price:e.target.value}))}/></div>
              <button onClick={addAddon} style={{padding:"7px 14px",borderRadius:7,fontSize:13,fontWeight:600,cursor:"pointer",background:C.p,border:"none",color:"#fff",fontFamily:"inherit"}}>Add</button>
              <button onClick={()=>setShowNewAddon(false)} style={{padding:"7px 11px",borderRadius:7,fontSize:13,cursor:"pointer",background:"transparent",border:`1px solid ${C.b0}`,color:C.mu,fontFamily:"inherit"}}>{"\u2715"}</button>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {addons.map(a=>(
              <div key={a.id} style={{background:C.s0,border:`1px solid ${C.b0}`,borderRadius:9,padding:"10px 13px",display:"flex",alignItems:"center",gap:10,opacity:a.active?1:.5}}>
                <div style={{flex:2,minWidth:120}}><InlineInput value={a.lbl} onChange={e=>updateAddon(a.id,"lbl",e.target.value)}/></div>
                <div style={{width:90,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{color:C.gr,fontSize:12,fontWeight:700,flexShrink:0}}>$</span>
                  <InlineInput type="number" min="0" value={a.price} onChange={e=>updateAddon(a.id,"price",+e.target.value)} style={{textAlign:"right"}}/>
                </div>
                <IBtn onClick={()=>toggleAddonActive(a.id)} col={a.active?C.a:C.di} title={a.active?"Hide from quiz":"Show in quiz"}>{a.active?<Eye size={14}/>:<EyeOff size={14}/>}</IBtn>
                <IBtn onClick={()=>removeAddon(a.id)} col={C.re} title="Delete"><Trash2 size={14}/></IBtn>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashTab==="services" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{color:C.mu,fontSize:13}}>Edit base prices and durations inline. Inactive services are hidden from the quiz.</p>
            <button onClick={()=>setShowNewType(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:C.pBg,border:`1px solid ${C.pBd}`,color:C.p,fontFamily:"inherit"}}><Plus size={13}/> Add Service</button>
          </div>
          {showNewType && (
            <div style={{background:C.s1,border:`1px solid ${C.pBd}`,borderRadius:11,padding:16,marginBottom:12}}>
              <h4 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:15,marginBottom:12}}>New service type</h4>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                {[["Label","lbl","text"],["Base Price $","base","number"],["Duration (days)","dur","number"]].map(([lbl,field,type])=>(
                  <div key={field}><div style={{fontSize:11,color:C.di,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>{lbl}</div><InlineInput type={type} min="0" value={newType[field]} onChange={e=>setNewType(f=>({...f,[field]:e.target.value}))}/></div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div><div style={{fontSize:11,color:C.di,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>Description</div><InlineInput value={newType.desc} onChange={e=>setNewType(f=>({...f,desc:e.target.value}))}/></div>
                <div><div style={{fontSize:11,color:C.di,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.3}}>Icon</div>
                  <select value={newType.iconKey} onChange={e=>setNewType(f=>({...f,iconKey:e.target.value}))} style={{background:"rgba(255,255,255,.05)",border:`1px solid ${C.b0}`,borderRadius:6,color:C.tx,fontSize:13,padding:"5px 9px",width:"100%"}}>
                    {ICON_KEYS.map(k=><option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addType} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:C.p,border:"none",color:"#fff",fontFamily:"inherit"}}>Add</button>
                <button onClick={()=>setShowNewType(false)} style={{padding:"8px 13px",borderRadius:8,fontSize:13,cursor:"pointer",background:"transparent",border:`1px solid ${C.b0}`,color:C.mu,fontFamily:"inherit"}}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {types.map(t=>{
              const Ic=ICON_MAP[t.iconKey]||Zap;
              return (
                <div key={t.id} style={{background:C.s0,border:`1px solid ${C.b0}`,borderRadius:9,padding:"10px 13px",display:"flex",alignItems:"center",gap:10,opacity:t.active?1:.5}}>
                  <div style={{color:C.mu,flexShrink:0}}><Ic size={16}/></div>
                  <div style={{flex:2,fontSize:13,fontWeight:600,color:C.tx,minWidth:120}}>{t.lbl}</div>
                  <div style={{width:100,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{color:C.gold,fontSize:12,flexShrink:0}}>$</span>
                    <InlineInput type="number" min="0" value={t.base} onChange={e=>updateType(t.id,"base",+e.target.value)} style={{textAlign:"right"}}/>
                  </div>
                  <div style={{width:80,display:"flex",alignItems:"center",gap:5}}>
                    <InlineInput type="number" min="1" value={t.dur} onChange={e=>updateType(t.id,"dur",+e.target.value)} style={{textAlign:"right"}}/>
                    <span style={{color:C.di,fontSize:11,flexShrink:0}}>d</span>
                  </div>
                  <IBtn onClick={()=>toggleTypeActive(t.id)} col={t.active?C.a:C.di} title={t.active?"Deactivate":"Activate"}>{t.active?<Eye size={14}/>:<EyeOff size={14}/>}</IBtn>
                  <IBtn onClick={()=>removeType(t.id)} col={C.re} title="Delete"><Trash2 size={14}/></IBtn>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FLabel({label,req,opt,children}) {
  return (
    <div>
      <div style={{fontSize:11,fontWeight:700,color:"rgba(234,234,245,0.4)",marginBottom:6,letterSpacing:.4,textTransform:"uppercase"}}>
        {label} {req&&<span style={{color:"#f87171"}}>*</span>}{opt&&<span style={{opacity:.6}}>(optional)</span>}
      </div>
      {children}
    </div>
  );
}
