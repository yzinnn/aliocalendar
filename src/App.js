import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "/api/jobs";

const DEMO = [
  {id:1,company:"(데모) 한국가스공사",title:"2026 상반기 청년인턴 채용",type:"청년인턴",subType:"체험형",category:"기계",location:"대전",address:"대전",startDate:"2026-03-20",endDate:"2026-04-10",people:5,url:"https://job.alio.go.kr",ongoing:true},
  {id:2,company:"(데모) 한국도로공사",title:"기간제근로자(도로관리원) 채용공고",type:"계약직",subType:"",category:"기계",location:"창원",address:"창원",startDate:"2026-03-24",endDate:"2026-03-31",people:1,url:"https://job.alio.go.kr",ongoing:true},
  {id:3,company:"(데모) 한국항공우주산업",title:"청년인턴 설계",type:"청년인턴",subType:"채용형",category:"기계",location:"창원",address:"경남",startDate:"2026-03-28",endDate:"2026-04-18",people:8,url:"https://job.alio.go.kr",ongoing:true},
  {id:4,company:"(데모) 두산에너빌리티",title:"신입 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-01",endDate:"2026-04-20",people:6,url:"https://job.alio.go.kr",ongoing:true},
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
  const [apiError, setApiError] = useState(null); 
  const [lu, setLu] = useState(null);
  const [pn, setPn] = useState(false);
  const [applied, setApplied] = useState(loadApplied);
  const [tab, setTab] = useState("calendar");
  const ref = useRef();

  const toggleApplied = (id) => {
    setApplied(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id]; else next[id] = true;
      saveApplied(next);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLd(true); setApiError(null);
    try {
      const r = await fetch(API_URL);
      if (!r.ok) throw new Error(`서버 응답 오류 (HTTP ${r.status})`);
      const j = await r.json();
      if (!j.success) throw new Error(`API 내부 오류: ${j.error || "알 수 없는 에러"}`);
      
      if (j.data && j.data.length > 0) { setJobs(j.data); setDemo(false); }
      else { setJobs(DEMO); setDemo(true); }
      setLu(j.lastUpdated || new Date().toISOString());
    } catch (e) {
      setApiError(e.message); 
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

  const fj = jobs.filter(j => (lf === "전체" || j.location === lf) && (tf === "전체" || j.type === tf || (tf === "계약직" && j.type === "무기계약직")));
  const jfd = (ds) => fj.filter(j => j.startDate && j.endDate && inR(ds, j.startDate, j.endDate));
  
  // 달력 주(Week) 단위로 쪼개기
  const DIM = getDIM(yr, mo);
  const FD = getFD(yr, mo);
  const rawCells = Array(FD).fill(null).concat(Array.from({length: DIM}, (_, i) => i + 1));
  while (rawCells.length % 7 !== 0) rawCells.push(null);
  
  const weeks = [];
  for (let i = 0; i < rawCells.length; i += 7) {
    weeks.push(rawCells.slice(i, i + 7));
  }

  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const act = fj.filter(j => !calcDD(j.endDate).x);

  // 선택된 주차 인덱스 찾기
  let selectedWeekIdx = -1;
  if (pn && sel) {
    selectedWeekIdx = weeks.findIndex(week => week.includes(sel.day));
  }

  // 화면에 그릴 주 (선택되었으면 해당 주만, 아니면 전체)
  const visibleWeeks = selectedWeekIdx !== -1 ? [weeks[selectedWeekIdx]] : weeks;

  const click = (day) => {
    if (!day) return;
    const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSel({ day, ds, jobs: jfd(ds) }); setPn(true);
  };
  const pv = () => { if (mo === 0) { setYr(y => y - 1); setMo(11); } else { setMo(m => m - 1); } setPn(false); };
  const nx = () => { if (mo === 11) { setYr(y => y + 1); setMo(0); } else { setMo(m => m + 1); } setPn(false); };

  const getTypeColor = (type) => {
    if (type === "청년인턴") return "#10b981"; 
    if (type === "계약직" || type === "무기계약직") return "#8b5cf6"; 
    return "#3b82f6"; 
  };

  const JobCard = ({ job, showCheck }) => {
    const d = calcDD(job.endDate);
    const isApplied = applied[job.id];
    const targetUrl = (job.url && job.url !== "https://job.alio.go.kr/recruit.do") 
      ? job.url : `https://job.alio.go.kr/recruitView.do?pageNo=1&recrutPblntSn=${job.id}`;

    return (
      <div className={`modern-card ${isApplied ? "applied-card" : ""}`}>
        <div className="card-accent" style={{ background: getTypeColor(job.type) }} />
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="company-name">{job.company}</h3>
            <p className="job-title">{job.title}</p>
          </div>
          <div className="card-action-group">
            <span className={`d-day-badge ${d.u || d.x ? "urgent" : ""}`}>{d.t}</span>
            <button onClick={(e) => { e.stopPropagation(); window.open(targetUrl, "_blank"); }} className="link-btn">링크</button>
          </div>
        </div>
        
        <div className="tag-group">
          <span className="tag" style={{ background: `${getTypeColor(job.type)}15`, color: getTypeColor(job.type) }}>{job.type}</span>
          {job.subType && <span className="tag" style={{ background: "#f3f4f6", color: "#4b5563" }}>{job.subType}</span>}
          <span className="tag tag-location">{job.location}</span>
          {job.people > 0 && <span className="people-count">{job.people}명</span>}
        </div>
        
        <div className="card-footer">
          <span className="date-range">{fmt(job.startDate)} ~ {fmt(job.endDate)}</span>
          {showCheck && (
            <label className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={!!isApplied} onChange={() => toggleApplied(job.id)} />
              <div className="custom-checkbox">{isApplied ? "✓" : ""}</div>
              <span className={`checkbox-label ${isApplied ? "checked-text" : ""}`}>{isApplied ? "지원완료" : "미지원"}</span>
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
  <div className="app-container">
  <style>{`
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Pretendard', -apple-system, sans-serif; }
    body { background-color: #f8fafc; color: #0f172a; }
    .app-container { min-height: 100vh; display: flex; flex-direction: column; }
    
    /* 상단 헤더 (캡처본 스타일 유지 및 업데이트 시간 우측 상단 배치) */
    .header { background: #ffffff; padding: 20px 40px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 10; display: flex; flex-direction: column; gap: 16px; border-bottom: 1px solid #e2e8f0; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
    .title-area h1 { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-top: 4px; }
    .title-area span.label { font-size: 13px; color: #64748b; font-weight: 700; letter-spacing: 1px; }
    
    .update-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; font-weight: 500; }
    .update-btn { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; }
    .update-btn:hover { background: #e2e8f0; color: #0f172a; }

    /* 통계 필 알약 */
    .stats-group { display: flex; gap: 8px; margin-bottom: 4px; }
    .stat-pill { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; display: flex; gap: 4px; align-items: center; }
    .stat-blue { background: #eff6ff; color: #2563eb; }
    .stat-green { background: #ecfdf5; color: #059669; }
    .stat-purple { background: #f5f3ff; color: #7c3aed; }

    /* 필터 버튼 영역 */
    .filter-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .filter-group { display: flex; gap: 6px; }
    .filter-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #475569; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .filter-btn:hover { background: #f8fafc; border-color: #94a3b8; }
    .filter-btn.active { background: #2563eb; color: #ffffff; border-color: #2563eb; }
    
    .error-banner { background: #fef2f2; border-bottom: 1px solid #fca5a5; color: #b91c1c; padding: 12px 40px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 12px; }

    .mobile-tabs { display: none; background: #fff; border-bottom: 1px solid #e2e8f0; }
    .tab { flex: 1; text-align: center; padding: 14px 0; font-size: 15px; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; cursor: pointer; }
    .tab.active { color: #0f172a; border-bottom-color: #0f172a; }

    /* 메인 그리드 및 달력 확장 */
    .main-grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(360px, 1fr); gap: 32px; padding: 32px 40px; max-width: 1800px; margin: 0 auto; width: 100%; align-items: start; }
    
    .calendar-section { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); padding: 32px; width: 100%; transition: all 0.3s ease; }
    .cal-header { display: flex; justify-content: center; align-items: center; margin-bottom: 32px; position: relative; }
    .cal-nav-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; position: absolute; color: #64748b; transition: all 0.2s; }
    .cal-nav-btn:hover { background: #f1f5f9; color: #0f172a; }
    .btn-prev { left: 0; }
    .btn-next { right: 0; }
    .cal-title { font-size: 28px; font-weight: 800; color: #0f172a; }
    .cal-title span { font-size: 18px; color: #94a3b8; font-weight: 600; margin-left: 8px; }
    
    .cal-day-header-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 16px; }
    .cal-day-header { text-align: center; font-size: 15px; font-weight: 700; color: #64748b; }
    .cal-day-header.sun { color: #ef4444; }
    .cal-day-header.sat { color: #3b82f6; }
    
    .cal-week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 12px; }
    /* 글씨 및 셀 크기 시원하게 확대 */
    .cal-cell { min-height: 120px; border-radius: 12px; padding: 12px; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; background: #fff; }
    .cal-cell:hover { background: #f8fafc; border-color: #e2e8f0; }
    .cal-cell.today { background: #eff6ff; }
    .cal-cell.selected { background: #eff6ff; border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
    .date-num { font-size: 18px; font-weight: 700; color: #334155; }
    .date-num.sun { color: #ef4444; }
    .date-num.sat { color: #3b82f6; }
    
    /* 선택된 날짜 패널 (달력 안쪽에 표시됨) */
    .detail-panel { margin-top: 16px; border-top: 2px dashed #e2e8f0; padding-top: 24px; animation: slideDown 0.3s ease-out forwards; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .close-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; color: #64748b; font-size: 14px; font-weight: bold; }
    .close-btn:hover { background: #f1f5f9; color: #0f172a; }

    .list-section { position: sticky; top: 120px; display: flex; flex-direction: column; gap: 16px; height: calc(100vh - 140px); }
    .list-header { font-size: 17px; font-weight: 800; color: #0f172a; display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
    .scroll-area { overflow-y: auto; padding-right: 12px; padding-bottom: 24px; }
    .scroll-area::-webkit-scrollbar { width: 6px; }
    .scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    .modern-card { background: #ffffff; border-radius: 14px; padding: 20px; position: relative; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 16px; }
    .modern-card:hover { transform: translateY(-2px); box-shadow: 0 8px 12px -3px rgba(0,0,0,0.05); border-color: #cbd5e1; }
    .applied-card { opacity: 0.55; background: #f8fafc; }
    .card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; }
    .card-title-group { flex: 1; }
    .company-name { font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.3; word-break: keep-all; }
    .job-title { font-size: 14px; color: #475569; line-height: 1.4; word-break: keep-all; }
    
    .card-action-group { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
    .d-day-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; text-align: center; min-width: 56px; }
    .d-day-badge.urgent { background: #fef2f2; color: #dc2626; }
    .link-btn { background: #eff6ff; color: #2563eb; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 800; cursor: pointer; transition: background 0.2s; width: 100%; text-align: center; }
    .link-btn:hover { background: #dbeafe; }

    .tag-group { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; align-items: center; }
    .tag { padding: 4px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 700; }
    .tag-location { background: #fffbeb; color: #b45309; }
    .people-count { font-size: 13px; color: #94a3b8; font-weight: 600; margin-left: 2px; }

    .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 14px; }
    .date-range { font-size: 13px; color: #64748b; font-family: monospace; letter-spacing: -0.5px; font-weight: 500; }
    
    .checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .checkbox-wrapper input { display: none; }
    .custom-checkbox { width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: white; transition: all 0.2s; }
    .checkbox-wrapper input:checked + .custom-checkbox { background: #0f172a; border-color: #0f172a; }
    .checkbox-label { font-size: 13px; color: #64748b; font-weight: 600; transition: color 0.2s; }
    .checked-text { color: #0f172a; }

    @media (max-width: 1024px) {
      .main-grid { grid-template-columns: 1fr; gap: 24px; padding: 20px; }
      .cal-cell { min-height: 100px; }
      .list-section { position: relative; top: 0; height: auto; }
      .header { padding: 20px; }
    }
  `}</style>

  {apiError && (
    <div className="error-banner">
      <span style={{ fontSize: 18 }}>🚨</span>
      <span>Vercel 서버 통신 에러 발생! {apiError}</span>
    </div>
  )}

  <header className="header">
    <div className="header-top">
      <div className="title-area">
        <span className="label">JOB ALIO</span>
        <h1>대전·창원 채용 달력</h1>
      </div>
      <div className="update-info">
        {ld ? (
          <span>업데이트 중...</span>
        ) : (
          <>
            <span>{demo ? "DEMO 모드" : (lu ? `오후 ${new Date(lu).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit", hour12: false}).replace(/^1[2-9]|2[0-3]/, (m) => m-12)} 갱신` : "")}</span>
            <button className="update-btn" onClick={load}>↻</button>
          </>
        )}
      </div>
    </div>
    
    <div>
      <div className="stats-group">
        <div className="stat-pill stat-blue"><span>{act.length}</span>건</div>
        <div className="stat-pill stat-green"><span>{act.filter(j=>j.type==="청년인턴").length}</span>인턴</div>
        <div className="stat-pill stat-purple"><span>{act.filter(j=>j.type==="정규직").length}</span>정규직</div>
      </div>
      <div className="filter-row">
        <div className="filter-group">
          {["전체","대전","창원"].map(v => <button key={v} className={`filter-btn ${lf===v?"active":""}`} onClick={() => setLf(v)}>{v}</button>)}
        </div>
        <div style={{ width: 1, background: "#e2e8f0" }}/>
        <div className="filter-group">
          {["전체","청년인턴","정규직","계약직"].map(v => <button key={v} className={`filter-btn ${tf===v?"active":""}`} onClick={() => setTf(v)}>{v}</button>)}
        </div>
      </div>
    </div>
  </header>

  <main className="main-grid">
    <section className="calendar-section">
      <div className="cal-header">
        <button className="cal-nav-btn btn-prev" onClick={pv}>‹</button>
        <div className="cal-title">{mo+1}월<span>{yr}</span></div>
        <button className="cal-nav-btn btn-next" onClick={nx}>›</button>
      </div>

      <div className="cal-day-header-row">
        {DAYS_KR.map((d, i) => <div key={d} className={`cal-day-header ${i===0?'sun':i===6?'sat':''}`}>{d}</div>)}
      </div>

      <div>
        {/* 선택된 주(Week)만 렌더링하거나, 전체 달력 렌더링 */}
        {visibleWeeks.map((week, wIdx) => (
          <div key={wIdx} className="cal-week-row">
            {week.map((day, dIdx) => {
              if (!day) return <div key={`e${wIdx}-${dIdx}`} className="cal-cell" style={{ background: "transparent", border: "none" }} />;
              
              const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dj = jfd(ds);
              const isT = ds === ts;
              const isS = sel?.ds === ds;
              const dow = (FD + day - 1) % 7;
              
              return (
                <div key={day} className={`cal-cell ${isT?'today':''} ${isS?'selected':''}`} onClick={() => click(day)}>
                  <span className={`date-num ${dow===0?'sun':dow===6?'sat':''}`}>{day}</span>
                  
                  {/* 점 표기 로직 (최대 3개 + N) */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "auto", flexWrap: "wrap" }}>
                    {dj.slice(0, 3).map((job, k) => (
                      <div key={k} style={{ width: "8px", height: "8px", borderRadius: "50%", background: getTypeColor(job.type) }} />
                    ))}
                    {dj.length > 3 && (
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", marginLeft: "2px" }}>+{dj.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 날짜 선택 시 해당 주차 바로 아래에 나타나는 패널 */}
      {pn && sel && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
              {mo+1}/{sel.day} <span style={{ color: "#2563eb", fontSize: 18, marginLeft: 8 }}>{sel.jobs.length}건</span>
            </h3>
            <button className="close-btn" onClick={() => setPn(false)}>✕</button>
          </div>
          <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: 8 }} className="scroll-area">
            {sel.jobs.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>해당 날짜에 마감되는 공고가 없습니다.</div>
            ) : (
              sel.jobs.map(job => <JobCard key={job.id} job={job} showCheck={true} />)
            )}
          </div>
        </div>
      )}
    </section>

    <section className="list-section">
      <div className="list-header">
        <span>진행중인 공고 {act.length}건</span>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>지원 체크는 브라우저에 저장됩니다</span>
      </div>
      <div className="scroll-area" style={{ paddingTop: 16 }}>
        {act.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>진행중인 공고가 없습니다.</div>
        ) : (
          act.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)).map(job => <JobCard key={job.id} job={job} showCheck={true} />)
        )}
      </div>
    </section>
  </main>
  </div>
  );
}