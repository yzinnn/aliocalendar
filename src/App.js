import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://aliocalendar.vercel.app/api/jobs";

const DEMO = [
  {id:1,company:"(데모) 한국가스공사",title:"2026 상반기 청년인턴 채용",type:"청년인턴",subType:"체험형",category:"기계",location:"대전",address:"대전",startDate:"2026-03-20",endDate:"2026-04-10",people:5,url:"https://job.alio.go.kr",ongoing:true},
  {id:2,company:"(데모) 한국기계연구원",title:"기계분야 정규직 채용공고",type:"정규직",subType:"",category:"기계",location:"대전",address:"대전",startDate:"2026-03-25",endDate:"2026-04-15",people:3,url:"https://job.alio.go.kr",ongoing:true},
  {id:3,company:"(데모) 한국항공우주산업",title:"청년인턴 기계설계",type:"청년인턴",subType:"채용형",category:"기계",location:"창원",address:"경남",startDate:"2026-03-28",endDate:"2026-04-18",people:8,url:"https://job.alio.go.kr",ongoing:true},
  {id:4,company:"(데모) 두산에너빌리티",title:"기계직 신입 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-01",endDate:"2026-04-20",people:6,url:"https://job.alio.go.kr",ongoing:true},
  {id:5,company:"(데모) 한국에너지기술연구원",title:"연구인턴 모집",type:"청년인턴",subType:"체험형",category:"기계",location:"대전",address:"대전",startDate:"2026-04-03",endDate:"2026-04-22",people:4,url:"https://job.alio.go.kr",ongoing:true},
  {id:6,company:"(데모) 한화에어로스페이스",title:"기계직 경력 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-05",endDate:"2026-04-25",people:5,url:"https://job.alio.go.kr",ongoing:true},
  {id:7,company:"(데모) 한전KDN",title:"청년인턴 모집공고",type:"청년인턴",subType:"",category:"기계",location:"대전",address:"대전",startDate:"2026-03-22",endDate:"2026-04-08",people:6,url:"https://job.alio.go.kr",ongoing:true},
  {id:8,company:"(데모) 한국산업기술시험원",title:"기계분야 정규직",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-10",endDate:"2026-04-30",people:3,url:"https://job.alio.go.kr",ongoing:true},
];

const DAYS_KR = ["일","월","화","수","목","금","토"];
const MO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function getDIM(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFD(y, m) { return new Date(y, m, 1).getDay(); }
function fmt(d) { const x = new Date(d); return `${x.getMonth()+1}/${x.getDate()}`; }

function inR(d, s, e) {
  const a = new Date(d);
  const b = new Date(s);
  const c = new Date(e);
  a.setHours(0,0,0,0);
  b.setHours(0,0,0,0);
  c.setHours(0,0,0,0);
  return a >= b && a <= c;
}

function calcDD(end) {
  const t = new Date();
  const e = new Date(end);
  t.setHours(0,0,0,0);
  e.setHours(0,0,0,0);
  const d = Math.ceil((e - t) / 864e5);
  if (d < 0) return { t: "마감", u: false, x: true };
  if (d === 0) return { t: "D-Day", u: true, x: false };
  return { t: `D-${d}`, u: d <= 5, x: false };
}

export default function App() {
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth());
  const [sel, setSel] = useState(null);
  const [lf, setLf] = useState("전체");
  const [tf, setTf] = useState("전체");
  const [jobs, setJobs] = useState([]);
  const [ld, setLd] = useState(true);
  const [demo, setDemo] = useState(false);
  const [lu, setLu] = useState(null);
  const [pn, setPn] = useState(false);
  const [pi, setPi] = useState(false);
  const ref = useRef();

  const load = useCallback(async () => {
    setLd(true);
    if (!API_URL || API_URL.includes("your-app")) {
      setJobs(DEMO);
      setDemo(true);
      setLu(new Date().toISOString());
      setLd(false);
      return;
    }
    try {
      const r = await fetch(API_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "API error");
      if (j.data && j.data.length > 0) {
        setJobs(j.data);
        setDemo(false);
      } else {
        setJobs(DEMO);
        setDemo(true);
      }
      setLu(j.lastUpdated || new Date().toISOString());
    } catch (e) {
      console.warn("API fail, demo mode:", e.message);
      setJobs(DEMO);
      setDemo(true);
      setLu(new Date().toISOString());
    } finally {
      setLd(false);
    }
  }, []);

  useEffect(() => {
    load();
    ref.current = setInterval(() => {
      const n = new Date();
      if ((n.getUTCHours() + 9) % 24 === 9 && n.getMinutes() === 0) load();
    }, 6e4);
    return () => clearInterval(ref.current);
  }, [load]);

  const fj = jobs.filter(j => (lf === "전체" || j.location === lf) && (tf === "전체" || j.type === tf));
  const jfd = (ds) => fj.filter(j => j.startDate && j.endDate && inR(ds, j.startDate, j.endDate));
  const DIM = getDIM(yr, mo);
  const FD = getFD(yr, mo);
  const cells = [];
  for (let i = 0; i < FD; i++) cells.push(null);
  for (let d = 1; d <= DIM; d++) cells.push(d);
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const act = fj.filter(j => !calcDD(j.endDate).x);

  const click = (day) => {
    if (!day) return;
    const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSel({ day, ds, jobs: jfd(ds) });
    setPn(true);
    setPi(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPi(true)));
  };

  const pv = () => {
    if (mo === 0) { setYr(y => y - 1); setMo(11); }
    else { setMo(m => m - 1); }
    setPn(false);
  };

  const nx = () => {
    if (mo === 11) { setYr(y => y + 1); setMo(0); }
    else { setMo(m => m + 1); }
    setPn(false);
  };

  return (
  <div style={{minHeight:"100vh",background:"#060910",fontFamily:"'Noto Sans KR',-apple-system,sans-serif",color:"#dde3ef"}}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    .m{font-family:'IBM Plex Mono',monospace}
    .H{background:linear-gradient(145deg,#0b1120,#101a2e,#0c1224);border-bottom:1px solid rgba(70,120,240,.08);padding:20px 20px 16px;position:relative}
    .H::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 40%,rgba(50,90,230,.04),transparent 70%);pointer-events:none}
    .P{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:16px;font-size:12px;font-weight:500}
    .F{padding:5px 13px;border-radius:7px;border:1px solid rgba(70,120,240,.12);background:rgba(255,255,255,.02);color:#6a7993;font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
    .F:hover{background:rgba(70,120,240,.06);color:#98b3de}
    .F.on{background:rgba(45,95,225,.15);border-color:rgba(45,95,225,.4);color:#6da0ff}
    .N{width:34px;height:34px;border-radius:9px;border:1px solid rgba(70,120,240,.1);background:rgba(255,255,255,.02);color:#6a7993;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit}
    .N:hover{background:rgba(45,95,225,.1);color:#98b3de}
    .D{height:44px;border-radius:8px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;padding:4px 0 0 6px;cursor:pointer;transition:all .12s;position:relative;gap:1px;border:1px solid transparent}
    .D:hover{background:rgba(45,95,225,.06)}
    .D.t{border-color:rgba(45,95,225,.35);background:rgba(45,95,225,.06)}
    .D.s{background:rgba(45,95,225,.18);border-color:rgba(45,95,225,.5)}
    .J{background:rgba(255,255,255,.02);border:1px solid rgba(70,120,240,.08);border-radius:13px;padding:14px 14px 14px 18px;transition:all .2s;cursor:pointer;position:relative}
    .J:hover{background:rgba(45,95,225,.05);border-color:rgba(45,95,225,.2);transform:translateY(-1px)}
    .B{display:inline-flex;align-items:center;padding:2px 9px;border-radius:5px;font-size:10.5px;font-weight:600;letter-spacing:-.2px}
    .Bi{background:rgba(34,197,94,.1);color:#4ade80;border:1px solid rgba(34,197,94,.18)}
    .Br{background:rgba(45,95,225,.1);color:#6da0ff;border:1px solid rgba(45,95,225,.18)}
    .Bl{background:rgba(251,191,36,.08);color:#fbbf24;border:1px solid rgba(251,191,36,.12)}
    .Bd{font-family:'IBM Plex Mono',monospace;background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.18)}
    .Bd.ok{background:rgba(45,95,225,.08);color:#6da0ff;border-color:rgba(45,95,225,.15)}
    .pn{transition:transform .28s cubic-bezier(.16,1,.3,1),opacity .28s ease}
    .pn.in{transform:translateY(0);opacity:1}
    .pn.out{transform:translateY(10px);opacity:0}
    .sc{overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(70,120,240,.15) transparent}
    .sc::-webkit-scrollbar{width:3px}
    .sc::-webkit-scrollbar-thumb{background:rgba(70,120,240,.15);border-radius:2px}
    .L{position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 2px 2px 0}
    @keyframes sp{to{transform:rotate(360deg)}}
    .sp{width:20px;height:20px;border:2px solid rgba(70,120,240,.15);border-top-color:#6da0ff;border-radius:50%;animation:sp .7s linear infinite}
    @keyframes fp{0%,100%{opacity:.5}50%{opacity:1}}
    .pl{animation:fp 2s infinite}
    .sub{font-size:9.5px;padding:1px 6px;border-radius:4px;background:rgba(139,92,246,.1);color:#a78bfa;border:1px solid rgba(139,92,246,.15);margin-left:4px}
    .demo-bar{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.12);border-radius:10px;margin:10px 16px 0;padding:8px 14px;font-size:11.5px;color:#fbbf24;text-align:center;line-height:1.5}
  `}</style>

  <div className="H">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div>
        <div className="m" style={{fontSize:10,color:"#3a4e6e",fontWeight:600,letterSpacing:"1.8px",marginBottom:3}}>JOB ALIO TRACKER</div>
        <div style={{fontSize:19,fontWeight:700,letterSpacing:"-.5px"}}>대전·창원 채용 달력</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {ld ? <div className="sp"/> : (
          <>
            <div className="pl" style={{width:5,height:5,borderRadius:"50%",background:demo?"#fbbf24":"#22c55e"}}/>
            <span className="m" style={{fontSize:10,color:"#3a4e6e"}}>{demo ? "DEMO" : (lu ? `${new Date(lu).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})} 갱신` : "")}</span>
          </>
        )}
        <button onClick={load} className="N" style={{width:28,height:28,fontSize:13}} title="새로고침">↻</button>
      </div>
    </div>

    <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap"}}>
      <div className="P" style={{background:"rgba(45,95,225,.08)",color:"#6da0ff"}}><span className="m" style={{fontWeight:600}}>{act.length}</span><span>건 모집중</span></div>
      <div className="P" style={{background:"rgba(34,197,94,.06)",color:"#4ade80"}}><span className="m" style={{fontWeight:600}}>{act.filter(j=>j.type==="청년인턴").length}</span><span>인턴</span></div>
      <div className="P" style={{background:"rgba(139,92,246,.06)",color:"#a78bfa"}}><span className="m" style={{fontWeight:600}}>{act.filter(j=>j.type==="정규직").length}</span><span>정규직</span></div>
    </div>

    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {["전체","대전","창원"].map(v => <button key={v} className={`F ${lf===v?"on":""}`} onClick={() => setLf(v)}>{v === "전체" ? "📍 전체" : v}</button>)}
      <div style={{width:1,background:"rgba(70,120,240,.08)",margin:"0 3px"}}/>
      {["전체","청년인턴","정규직"].map(v => <button key={v} className={`F ${tf===v?"on":""}`} onClick={() => setTf(v)}>{v === "전체" ? "🏷 전체" : v}</button>)}
    </div>
  </div>

  {demo && <div className="demo-bar">DEMO 모드 · Vercel 백엔드 연결 후 실제 잡알리오 데이터로 자동 전환됩니다</div>}

  <div style={{padding:"14px 14px 6px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
      <button className="N" onClick={pv}>‹</button>
      <div><span style={{fontSize:21,fontWeight:700,letterSpacing:"-.5px"}}>{MO[mo]}</span><span className="m" style={{fontSize:13,color:"#3a4e6e",marginLeft:8}}>{yr}</span></div>
      <button className="N" onClick={nx}>›</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
      {DAYS_KR.map((d, i) => <div key={d} style={{textAlign:"left",paddingLeft:6,fontSize:10,fontWeight:600,color:i===0?"rgba(248,113,113,.5)":i===6?"rgba(96,165,250,.5)":"#38485e",padding:"4px 0 4px 6px"}}>{d}</div>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {cells.map((day, i) => {
        if (!day) return <div key={`e${i}`}/>;
        const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        const dj = jfd(ds);
        const isT = ds === ts;
        const isS = sel?.ds === ds;
        const dow = (FD + day - 1) % 7;
        return (
          <div key={day} className={`D ${isT?"t":""} ${isS?"s":""}`} onClick={() => click(day)}>
            <span className="m" style={{fontSize:11,fontWeight:isT?700:400,color:isS?"#6da0ff":isT?"#6da0ff":dow===0?"rgba(248,113,113,.6)":dow===6?"rgba(96,165,250,.6)":"#788da0"}}>{day}</span>
            {dj.length > 0 && (
              <div style={{display:"flex",gap:1.5,alignItems:"center"}}>
                {dj.slice(0,4).map((_, k) => <div key={k} style={{width:3,height:3,borderRadius:"50%",background:dj[k].type==="청년인턴"?"#4ade80":"#6da0ff"}}/>)}
                {dj.length > 4 && <span style={{fontSize:6,color:"#3a4e6e"}}>+{dj.length-4}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>

  {pn && sel && (
  <div className={`pn ${pi?"in":"out"}`} style={{margin:"6px 14px 14px",background:"rgba(8,12,22,.97)",border:"1px solid rgba(70,120,240,.1)",borderRadius:16,overflow:"hidden"}}>
    <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(70,120,240,.06)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <span className="m" style={{fontSize:15,fontWeight:700}}>{mo+1}/{sel.day}</span>
        <span style={{fontSize:11.5,color:sel.jobs.length?"#6da0ff":"#3a4e6e",fontWeight:500}}>{sel.jobs.length ? `${sel.jobs.length}건의 공고` : "공고 없음"}</span>
      </div>
      <button onClick={() => { setPn(false); setSel(null); }} style={{width:26,height:26,borderRadius:7,border:"1px solid rgba(70,120,240,.08)",background:"rgba(255,255,255,.02)",color:"#485a72",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>✕</button>
    </div>

    <div className="sc" style={{maxHeight:360,padding:"8px 12px 12px"}}>
      {sel.jobs.length === 0 ? (
        <div style={{textAlign:"center",padding:"36px 0",color:"#283550"}}>
          <div style={{fontSize:28,marginBottom:6,opacity:.4}}>📭</div>
          <div style={{fontSize:12}}>해당 날짜에 공고가 없습니다</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sel.jobs.map((job, i) => {
            const d = calcDD(job.endDate);
            return (
            <div key={job.id || i} className="J" onClick={() => window.open(job.url,"_blank")}>
              <div className="L" style={{background:job.type==="청년인턴"?"linear-gradient(180deg,#4ade80,#22c55e)":"linear-gradient(180deg,#6da0ff,#3b82f6)"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14.5,fontWeight:600,letterSpacing:"-.3px",marginBottom:3,lineHeight:1.3}}>{job.company}</div>
                  <div style={{fontSize:11.5,color:"#536280",lineHeight:1.4}}>{job.title}</div>
                </div>
                <span className={`B Bd ${!d.u && !d.x ? "ok" : ""}`} style={{flexShrink:0,marginLeft:8}}>{d.t}</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7,alignItems:"center"}}>
                <span className={`B ${job.type==="청년인턴"?"Bi":"Br"}`}>{job.type}</span>
                {job.subType && <span className="sub">{job.subType}</span>}
                <span className="B Bl">{job.location}</span>
                {job.category && <span style={{fontSize:10,color:"#4a5e78",background:"rgba(255,255,255,.03)",padding:"1px 7px",borderRadius:4,border:"1px solid rgba(255,255,255,.04)"}}>{job.category}</span>}
                {job.people > 0 && <span style={{fontSize:10.5,color:"#485a72"}}>👤 {job.people}명</span>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span className="m" style={{fontSize:10.5,color:"#33485e"}}>{fmt(job.startDate)} ~ {fmt(job.endDate)}</span>
                {job.address && <span style={{fontSize:10.5,color:"#283a52",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>📍 {job.address}</span>}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  )}

  <div style={{padding:"10px 20px 20px",textAlign:"center"}}>
    <div style={{fontSize:10.5,color:"#1c2840",lineHeight:1.7}}>
      {demo ? "데모 데이터 표시중 · Vercel 백엔드 배포 후 API_URL 교체 시 실데이터 전환" : "opendata.alio.go.kr API 연동 · 매일 09:00 KST 자동 갱신"}
    </div>
  </div>
  </div>
  );
}