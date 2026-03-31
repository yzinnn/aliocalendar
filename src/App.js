import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "/api/jobs";

const DEMO = [
  {id:1,company:"(데모) 한국가스공사",title:"2026 상반기 청년인턴 채용",type:"청년인턴",subType:"체험형",category:"기계",location:"대전",address:"대전",startDate:"2026-03-20",endDate:"2026-04-10",people:5,url:"https://job.alio.go.kr",ongoing:true},
  {id:2,company:"(데모) 한국기계연구원",title:"정규직 채용공고",type:"정규직",subType:"",category:"기계",location:"대전",address:"대전",startDate:"2026-03-25",endDate:"2026-04-15",people:3,url:"https://job.alio.go.kr",ongoing:true},
  {id:3,company:"(데모) 한국항공우주산업",title:"청년인턴 설계",type:"청년인턴",subType:"채용형",category:"기계",location:"창원",address:"경남",startDate:"2026-03-28",endDate:"2026-04-18",people:8,url:"https://job.alio.go.kr",ongoing:true},
  {id:4,company:"(데모) 두산에너빌리티",title:"신입 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-01",endDate:"2026-04-20",people:6,url:"https://job.alio.go.kr",ongoing:true},
  {id:5,company:"(데모) 한국에너지기술연구원",title:"연구인턴 모집",type:"청년인턴",subType:"체험형",category:"연구",location:"대전",address:"대전",startDate:"2026-04-03",endDate:"2026-04-22",people:4,url:"https://job.alio.go.kr",ongoing:true},
  {id:6,company:"(데모) 한화에어로스페이스",title:"경력 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-05",endDate:"2026-04-25",people:5,url:"https://job.alio.go.kr",ongoing:true},
  {id:7,company:"(데모) 한전KDN",title:"청년인턴 모집공고",type:"청년인턴",subType:"",category:"IT",location:"대전",address:"대전",startDate:"2026-03-22",endDate:"2026-04-08",people:6,url:"https://job.alio.go.kr",ongoing:true},
  {id:8,company:"(데모) 한국산업기술시험원",title:"정규직 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-10",endDate:"2026-04-30",people:3,url:"https://job.alio.go.kr",ongoing:true},
];

const DAYS_KR = ["일","월","화","수","목","금","토"];
const MO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function getDIM(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFD(y, m) { return new Date(y, m, 1).getDay(); }
function fmt(d) { const x = new Date(d); return `${x.getMonth()+1}/${x.getDate()}`; }
function inR(d, s, e) {
  const a = new Date(d), b = new Date(s), c = new Date(e);
  a.setHours(0,0,0,0); b.setHours(0,0,0,0); c.setHours(0,0,0,0);
  return a >= b && a <= c;
}
function calcDD(end) {
  const t = new Date(), e = new Date(end);
  t.setHours(0,0,0,0); e.setHours(0,0,0,0);
  const d = Math.ceil((e - t) / 864e5);
  if (d < 0) return { t: "마감", u: false, x: true };
  if (d === 0) return { t: "D-Day", u: true, x: false };
  return { t: `D-${d}`, u: d <= 5, x: false };
}

function loadApplied() {
  try { return JSON.parse(window.localStorage.getItem("applied") || "{}"); } catch { return {}; }
}
function saveApplied(obj) {
  try { window.localStorage.setItem("applied", JSON.stringify(obj)); } catch { /* noop */ }
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
  const [applied, setApplied] = useState(loadApplied);
  const [tab, setTab] = useState("calendar");
  const ref = useRef();

  const toggleApplied = (id) => {
    setApplied(prev => {
      const next = { ...prev };
      if (next[id]) { delete next[id]; } else { next[id] = true; }
      saveApplied(next);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLd(true);
    if (!API_URL || API_URL.includes("your-app")) {
      setJobs(DEMO); setDemo(true); setLu(new Date().toISOString()); setLd(false); return;
    }
    try {
      const r = await fetch(API_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "API error");
      if (j.data && j.data.length > 0) { setJobs(j.data); setDemo(false); }
      else { setJobs(DEMO); setDemo(true); }
      setLu(j.lastUpdated || new Date().toISOString());
    } catch (e) {
      setJobs(DEMO); setDemo(true); setLu(new Date().toISOString());
    } finally { setLd(false); }
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
  
  // 마감 안 된(진행 중인) 공고만 필터링
  const act = fj.filter(j => !calcDD(j.endDate).x);

  const click = (day) => {
    if (!day) return;
    const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSel({ day, ds, jobs: jfd(ds) }); setPn(true); setPi(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPi(true)));
  };
  const pv = () => { if (mo === 0) { setYr(y => y - 1); setMo(11); } else { setMo(m => m - 1); } setPn(false); };
  const nx = () => { if (mo === 11) { setYr(y => y + 1); setMo(0); } else { setMo(m => m + 1); } setPn(false); };

  const JobCard = ({ job, showCheck }) => {
    const d = calcDD(job.endDate);
    const isApplied = applied[job.id];
    
    // 원문 상세 URL 파싱 (API가 상세 주소를 안 주면 id로 직접 연결)
    const targetUrl = (job.url && job.url !== "https://job.alio.go.kr/recruit.do") 
      ? job.url 
      : `https://job.alio.go.kr/recruitView.do?pageNo=1&recrutPblntSn=${job.id}`;

    return (
      <div className="jc" style={{ opacity: isApplied ? 0.55 : 1 }}>
        <div className="jc-bar" style={{ background: job.type === "청년인턴" ? "#16a34a" : "#2563eb" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ flex: 1, paddingRight: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 2, lineHeight: 1.3 }}>{job.company}</div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.4 }}>{job.title}</div>
          </div>
          {/* 링크와 D-Day를 우측 상단으로 이동 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); window.open(targetUrl, "_blank"); }} className="link-btn">링크</button>
            <span className={`dd ${d.u || d.x ? "ur" : ""}`}>{d.t}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
          <span className={`tag ${job.type === "청년인턴" ? "tag-i" : "tag-r"}`}>{job.type}</span>
          {job.subType && <span className="tag tag-s">{job.subType}</span>}
          <span className="tag tag-l">{job.location}</span>
          {job.people > 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>{job.people}명</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(job.startDate)} ~ {fmt(job.endDate)}</span>
          {showCheck && (
            <label className="chk" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={!!isApplied} onChange={() => toggleApplied(job.id)} />
              <span className="chk-box">{isApplied ? "✓" : ""}</span>
              <span style={{ fontSize: 11, color: isApplied ? "#16a34a" : "#9ca3af" }}>{isApplied ? "지원완료" : "미지원"}</span>
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
  <div style={{ minHeight: "100vh", background: "#f8f9fb", fontFamily: "'Noto Sans KR',-apple-system,sans-serif", color: "#1a1a1a" }}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    .mn{font-family:'IBM Plex Mono',monospace}
    .hd{background:#fff;border-bottom:1px solid #e5e7eb;padding:18px 20px 14px}
    .pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:14px;font-size:11.5px;font-weight:500}
    .fb{padding:5px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;font-family:inherit}
    .fb:hover{background:#f3f4f6;color:#374151}
    .fb.on{background:#2563eb;border-color:#2563eb;color:#fff}
    .nb{width:32px;height:32px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit}
    .nb:hover{background:#f3f4f6;color:#111}
    .cel{height:42px;border-radius:8px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;padding:3px 0 0 5px;cursor:pointer;transition:all .12s;position:relative;gap:1px;border:1px solid transparent}
    .cel:hover{background:#f0f4ff}
    .cel.td{border-color:#2563eb;background:#eff6ff}
    .cel.sl{background:#dbeafe;border-color:#2563eb}
    .jc{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 12px 12px 16px;transition:all .15s;position:relative;margin-bottom:8px}
    .jc:hover{border-color:#bfdbfe;box-shadow:0 2px 8px rgba(37,99,235,.06)}
    .jc-bar{position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 2px 2px 0}
    .tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10.5px;font-weight:600}
    .tag-i{background:#dcfce7;color:#16a34a}
    .tag-r{background:#dbeafe;color:#2563eb}
    .tag-s{background:#f3e8ff;color:#7c3aed}
    .tag-l{background:#fef9c3;color:#a16207}
    .dd{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:#eff6ff;color:#2563eb;flex-shrink:0}
    .dd.ur{background:#fef2f2;color:#dc2626}
    .pn{transition:transform .25s cubic-bezier(.16,1,.3,1),opacity .25s ease}
    .pn.in{transform:translateY(0);opacity:1}
    .pn.out{transform:translateY(8px);opacity:0}
    .sc{overflow-y:auto;scrollbar-width:thin;scrollbar-color:#d1d5db transparent}
    .sc::-webkit-scrollbar{width:3px}
    .sc::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px}
    @keyframes sp{to{transform:rotate(360deg)}}
    .sp{width:18px;height:18px;border:2px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:sp .7s linear infinite}
    .demo-bar{background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin:10px 16px 0;padding:8px 14px;font-size:11.5px;color:#a16207;text-align:center}
    .tab-bar{display:flex;gap:0;background:#fff;border-bottom:1px solid #e5e7eb}
    .tab-btn{flex:1;padding:10px 0;text-align:center;font-size:13px;font-weight:500;color:#9ca3af;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;font-family:inherit;transition:all .15s}
    .tab-btn.on{color:#2563eb;border-bottom-color:#2563eb;font-weight:600}
    .tab-btn:hover{color:#374151}
    /* 링크 버튼 디자인 상단 강조형으로 변경 */
    .link-btn{padding:4px 12px;border-radius:6px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
    .link-btn:hover{background:#dbeafe;border-color:#93c5fd}
    .chk{display:flex;align-items:center;gap:4px;cursor:pointer}
    .chk input{display:none}
    .chk-box{width:18px;height:18px;border-radius:4px;border:1.5px solid #d1d5db;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;transition:all .15s}
    .chk input:checked+.chk-box{background:#16a34a;border-color:#16a34a}
    
    /* PC: 달력 크게, 리스트 작게 고정 */
    .main-layout { display: flex; flex-direction: column; gap: 20px; max-width: 1200px; margin: 0 auto; }
    .mobile-hide { display: none !important; }
    
    @media (min-width: 1024px) {
      .main-layout { flex-direction: row; align-items: flex-start; padding: 20px; }
      .calendar-section { flex: 1; background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #e5e7eb; display: block !important; }
      /* 우측 리스트 영역 320px로 고정 */
      .list-section { flex: 0 0 320px; position: sticky; top: 20px; max-height: calc(100vh - 40px); display: block !important; }
      .tab-bar { display: none; }
    }
  `}</style>

  {/* 헤더 */}
  <div className="hd">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <div>
        <div className="mn" style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, letterSpacing: "1.5px", marginBottom: 2 }}>JOB ALIO</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>대전·창원 채용 달력</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {ld ? <div className="sp"/> : (
          <span className="mn" style={{ fontSize: 10, color: "#9ca3af" }}>
            {demo ? "DEMO" : (lu ? `${new Date(lu).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})} 갱신` : "")}
          </span>
        )}
        <button onClick={load} className="nb" style={{ width: 28, height: 28, fontSize: 13 }}>↻</button>
      </div>
    </div>

    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
      <div className="pill" style={{ background: "#eff6ff", color: "#2563eb" }}><span className="mn" style={{ fontWeight: 600 }}>{act.length}</span>건</div>
      <div className="pill" style={{ background: "#dcfce7", color: "#16a34a" }}><span className="mn" style={{ fontWeight: 600 }}>{act.filter(j=>j.type==="청년인턴").length}</span>인턴</div>
      <div className="pill" style={{ background: "#f3e8ff", color: "#7c3aed" }}><span className="mn" style={{ fontWeight: 600 }}>{act.filter(j=>j.type==="정규직").length}</span>정규직</div>
    </div>

    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {["전체","대전","창원"].map(v => <button key={v} className={`fb ${lf===v?"on":""}`} onClick={() => setLf(v)}>{v}</button>)}
      <div style={{ width: 1, background: "#e5e7eb", margin: "0 2px" }}/>
      {["전체","청년인턴","정규직"].map(v => <button key={v} className={`fb ${tf===v?"on":""}`} onClick={() => setTf(v)}>{v}</button>)}
    </div>
  </div>

  {demo && <div className="demo-bar">DEMO 모드 · API 연결 후 실제 데이터로 전환됩니다</div>}

  {/* 모바일용 탭 바 */}
  <div className="tab-bar">
    <button className={`tab-btn ${tab==="calendar"?"on":""}`} onClick={() => setTab("calendar")}>📅 달력</button>
    <button className={`tab-btn ${tab==="list"?"on":""}`} onClick={() => setTab("list")}>📋 전체 목록</button>
  </div>

  {/* 메인 레이아웃 */}
  <div className="main-layout">
    
    {/* ══ 왼쪽: 달력 섹션 ══ */}
    <div className={`calendar-section ${(tab !== 'calendar') ? 'mobile-hide' : ''}`} style={tab === 'calendar' ? { padding: "12px 14px 6px" } : {}}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="nb" onClick={pv}>‹</button>
        <div><span style={{ fontSize: 20, fontWeight: 700 }}>{MO[mo]}</span><span className="mn" style={{ fontSize: 13, color: "#9ca3af", marginLeft: 8 }}>{yr}</span></div>
        <button className="nb" onClick={nx}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
        {DAYS_KR.map((d, i) => <div key={d} style={{ textAlign: "left", paddingLeft: 5, fontSize: 10, fontWeight: 600, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#9ca3af", padding: "3px 0 3px 5px" }}>{d}</div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>;
          const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dj = jfd(ds);
          const isT = ds === ts;
          const isS = sel?.ds === ds;
          const dow = (FD + day - 1) % 7;
          return (
            <div key={day} className={`cel ${isT?"td":""} ${isS?"sl":""}`} onClick={() => click(day)}>
              <span className="mn" style={{ fontSize: 11, fontWeight: isT ? 700 : 400, color: isS ? "#2563eb" : isT ? "#2563eb" : dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "#374151" }}>{day}</span>
              {dj.length > 0 && (
                <div style={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  {dj.slice(0, 4).map((_, k) => <div key={k} style={{ width: 4, height: 4, borderRadius: "50%", background: dj[k].type === "청년인턴" ? "#16a34a" : "#2563eb" }}/>)}
                  {dj.length > 4 && <span style={{ fontSize: 7, color: "#9ca3af" }}>+{dj.length - 4}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 날짜 클릭 패널 */}
      {pn && sel && (
      <div className={`pn ${pi?"in":"out"}`} style={{ marginTop: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mn" style={{ fontSize: 14, fontWeight: 700 }}>{mo+1}/{sel.day}</span>
            <span style={{ fontSize: 12, color: sel.jobs.length ? "#2563eb" : "#9ca3af", fontWeight: 500 }}>{sel.jobs.length ? `${sel.jobs.length}건` : "공고 없음"}</span>
          </div>
          <button onClick={() => { setPn(false); setSel(null); }} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#9ca3af", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>✕</button>
        </div>
        <div className="sc" style={{ maxHeight: 340, padding: "8px 10px 10px" }}>
          {sel.jobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#d1d5db" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>📭</div>
              <div style={{ fontSize: 12 }}>해당 날짜에 공고가 없습니다</div>
            </div>
          ) : (
            sel.jobs.map((job, i) => <JobCard key={job.id || i} job={job} showCheck={true} />)
          )}
        </div>
      </div>
      )}
    </div>

    {/* ══ 오른쪽: 전체 목록 섹션 (진행 중인 공고만) ══ */}
    <div className={`list-section ${(tab !== 'list') ? 'mobile-hide' : ''}`} style={tab === 'list' ? { padding: "12px 14px" } : {}}>
      <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280" }}>
        진행중인 공고 {act.length}건 · 지원 체크는 브라우저에 저장됩니다
      </div>
      <div className="sc" style={{ maxHeight: "calc(100vh - 200px)", paddingRight: "4px" }}>
        {act.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#d1d5db" }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>📭</div>
            <div style={{ fontSize: 12 }}>조건에 맞는 진행중인 공고가 없습니다</div>
          </div>
        ) : (
          act.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)).map((job, i) => <JobCard key={job.id || i} job={job} showCheck={true} />)
        )}
      </div>
    </div>

  </div>

  {/* 푸터 */}
  <div style={{ padding: "10px 20px 20px", textAlign: "center" }}>
    <div style={{ fontSize: 10, color: "#d1d5db" }}>
      {demo ? "데모 데이터 · API 연결 시 자동 전환" : "opendata.alio.go.kr · 매일 09:00 KST 갱신"}
    </div>
  </div>
  </div>
  );
}