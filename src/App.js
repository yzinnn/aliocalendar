import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "/api/jobs";

const DEMO = [
  {id:1,company:"(데모) 한국가스공사",title:"2026 상반기 청년인턴 채용",type:"청년인턴",subType:"체험형",category:"기계",location:"대전",address:"대전",startDate:"2026-03-20",endDate:"2026-04-10",people:5,url:"https://job.alio.go.kr",ongoing:true},
  {id:2,company:"(데모) 한국기계연구원",title:"정규직 채용공고",type:"정규직",subType:"",category:"기계",location:"대전",address:"대전",startDate:"2026-03-25",endDate:"2026-04-15",people:3,url:"https://job.alio.go.kr",ongoing:true},
  {id:3,company:"(데모) 한국항공우주산업",title:"청년인턴 설계",type:"청년인턴",subType:"채용형",category:"기계",location:"창원",address:"경남",startDate:"2026-03-28",endDate:"2026-04-18",people:8,url:"https://job.alio.go.kr",ongoing:true},
  {id:4,company:"(데모) 두산에너빌리티",title:"신입 채용",type:"정규직",subType:"",category:"기계",location:"창원",address:"경남",startDate:"2026-04-01",endDate:"2026-04-20",people:6,url:"https://job.alio.go.kr",ongoing:true},
  {id:5,company:"(데모) 한국에너지기술연구원",title:"연구인턴 모집",type:"청년인턴",subType:"체험형",category:"연구",location:"대전",address:"대전",startDate:"2026-04-03",endDate:"2026-04-22",people:4,url:"https://job.alio.go.kr",ongoing:true},
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
  const [apiError, setApiError] = useState(null); // 에러 원인 파악용 상태 추가
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
      if (!r.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${r.status}): ${r.statusText || '서버리스 함수 경로 문제일 수 있습니다.'}`);
      }
      const j = await r.json();
      if (!j.success) throw new Error(`API 내부 오류: ${j.error || "알 수 없는 에러"}`);
      
      if (j.data && j.data.length > 0) { 
        setJobs(j.data); setDemo(false); 
      } else { 
        setJobs(DEMO); setDemo(true); 
      }
      setLu(j.lastUpdated || new Date().toISOString());
    } catch (e) {
      setApiError(e.message); // 어떤 에러인지 화면에 띄우기 위해 저장
      setJobs(DEMO); setDemo(true); setLu(new Date().toISOString());
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
    setSel({ day, ds, jobs: jfd(ds) }); setPn(true);
  };
  const pv = () => { if (mo === 0) { setYr(y => y - 1); setMo(11); } else { setMo(m => m - 1); } setPn(false); };
  const nx = () => { if (mo === 11) { setYr(y => y + 1); setMo(0); } else { setMo(m => m + 1); } setPn(false); };

  const JobCard = ({ job, showCheck }) => {
    const d = calcDD(job.endDate);
    const isApplied = applied[job.id];
    const targetUrl = (job.url && job.url !== "https://job.alio.go.kr/recruit.do") 
      ? job.url 
      : `https://job.alio.go.kr/recruitView.do?pageNo=1&recrutPblntSn=${job.id}`;

    return (
      <div className={`modern-card ${isApplied ? "applied-card" : ""}`}>
        <div className="card-accent" style={{ background: job.type === "청년인턴" ? "#10b981" : "#3b82f6" }} />
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="company-name">{job.company}</h3>
            <p className="job-title">{job.title}</p>
          </div>
          {/* 요청하신 대로 디데이 태그 아래에 링크 버튼 배치 */}
          <div className="card-action-group">
            <span className={`d-day-badge ${d.u || d.x ? "urgent" : ""}`}>{d.t}</span>
            <button onClick={(e) => { e.stopPropagation(); window.open(targetUrl, "_blank"); }} className="link-btn">링크</button>
          </div>
        </div>
        
        <div className="tag-group">
          <span className={`tag ${job.type === "청년인턴" ? "tag-intern" : "tag-regular"}`}>{job.type}</span>
          {job.subType && <span className="tag tag-subtype">{job.subType}</span>}
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
    body { background-color: #f3f4f6; color: #111827; }
    
    .app-container { min-height: 100vh; display: flex; flex-direction: column; }
    
    /* 헤더 영역 */
    .header { background: #ffffff; padding: 24px 5%; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 10; }
    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .title-area h1 { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .title-area span { font-size: 12px; color: #6b7280; font-weight: 600; }
    
    .filter-group { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-btn { padding: 8px 16px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; color: #4b5563; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .filter-btn:hover { background: #f9fafb; border-color: #d1d5db; }
    .filter-btn.active { background: #111827; color: #ffffff; border-color: #111827; }
    
    /* 에러 표시 바 (데모 원인 파악용) */
    .error-banner { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 12px 5%; font-size: 14px; font-weight: 600; display: flex; flex-direction: column; gap: 4px; }
    .demo-banner { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; padding: 12px 5%; font-size: 14px; font-weight: 600; text-align: center; }

    /* 모바일 탭 */
    .mobile-tabs { display: none; background: #fff; border-bottom: 1px solid #e5e7eb; }
    .tab { flex: 1; text-align: center; padding: 14px 0; font-size: 15px; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; cursor: pointer; }
    .tab.active { color: #111827; border-bottom-color: #111827; }

    /* 메인 그리드 (반응형 비율 핵심) */
    .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; padding: 24px 5%; max-width: 1600px; margin: 0 auto; width: 100%; align-items: start; }
    
    /* 캘린더 섹션 */
    .calendar-section { background: #ffffff; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); padding: 24px; }
    .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .cal-nav-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .cal-nav-btn:hover { background: #f3f4f6; }
    .cal-title { font-size: 24px; font-weight: 700; }
    .cal-title span { font-size: 16px; color: #9ca3af; font-weight: 500; margin-left: 8px; }
    
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .cal-day-header { text-align: center; font-size: 13px; font-weight: 600; color: #6b7280; padding-bottom: 12px; }
    .cal-day-header.sun { color: #ef4444; }
    .cal-day-header.sat { color: #3b82f6; }
    
    .cal-cell { min-height: 100px; border-radius: 12px; padding: 8px; border: 1px solid #f3f4f6; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; }
    .cal-cell:hover { border-color: #d1d5db; background: #f9fafb; }
    .cal-cell.today { border-color: #3b82f6; background: #eff6ff; }
    .cal-cell.selected { border-color: #111827; box-shadow: 0 0 0 1px #111827; }
    .date-num { font-size: 14px; font-weight: 600; color: #374151; }
    .date-num.sun { color: #ef4444; }
    .date-num.sat { color: #3b82f6; }
    .dots-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }

    /* 리스트 섹션 */
    .list-section { position: sticky; top: 120px; display: flex; flex-direction: column; gap: 16px; height: calc(100vh - 140px); }
    .list-header { font-size: 16px; font-weight: 700; color: #111827; display: flex; justify-content: space-between; align-items: center; }
    .scroll-area { overflow-y: auto; padding-right: 8px; padding-bottom: 24px; }
    .scroll-area::-webkit-scrollbar { width: 6px; }
    .scroll-area::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

    /* 카드 디자인 (미감 개선) */
    .modern-card { background: #ffffff; border-radius: 16px; padding: 20px; position: relative; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 16px; }
    .modern-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
    .applied-card { opacity: 0.6; background: #f9fafb; }
    .card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; }
    .card-title-group { flex: 1; }
    .company-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; line-height: 1.3; }
    .job-title { font-size: 14px; color: #4b5563; line-height: 1.4; }
    
    /* 우측 액션 영역 (디데이 아래 링크) */
    .card-action-group { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
    .d-day-badge { background: #f3f4f6; color: #4b5563; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; }
    .d-day-badge.urgent { background: #fef2f2; color: #dc2626; }
    .link-btn { background: #eff6ff; color: #2563eb; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; width: 100%; text-align: center; }
    .link-btn:hover { background: #dbeafe; }

    .tag-group { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; align-items: center; }
    .tag { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .tag-intern { background: #ecfdf5; color: #059669; }
    .tag-regular { background: #eff6ff; color: #2563eb; }
    .tag-subtype { background: #f3e8ff; color: #7c3aed; }
    .tag-location { background: #fefce8; color: #a16207; }
    .people-count { font-size: 13px; color: #9ca3af; font-weight: 500; }

    .card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 12px; }
    .date-range { font-size: 13px; color: #6b7280; font-family: monospace; letter-spacing: -0.5px; }
    
    .checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .checkbox-wrapper input { display: none; }
    .custom-checkbox { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: white; transition: all 0.2s; }
    .checkbox-wrapper input:checked + .custom-checkbox { background: #111827; border-color: #111827; }
    .checkbox-label { font-size: 13px; color: #6b7280; font-weight: 600; transition: color 0.2s; }
    .checked-text { color: #111827; }

    /* 반응형 처리: 태블릿 및 가로모드 모바일 */
    @media (max-width: 1024px) {
      .main-grid { grid-template-columns: 1.2fr 1fr; gap: 16px; padding: 16px 4%; }
      .cal-cell { min-height: 80px; }
    }

    /* 반응형 처리: 세로모드 모바일 */
    @media (max-width: 768px) {
      .mobile-tabs { display: flex; }
      .main-grid { display: block; padding: 0; }
      .calendar-section { border-radius: 0; box-shadow: none; padding: 16px; display: ${tab === 'calendar' ? 'block' : 'none'}; }
      .list-section { position: relative; top: 0; height: auto; padding: 16px; display: ${tab === 'list' ? 'flex' : 'none'}; }
      .cal-cell { min-height: 60px; padding: 4px; }
      .date-num { font-size: 12px; }
    }
  `}</style>

  {/* 디버깅용 에러 배너 (API가 실패하면 빨간색으로 화면 상단에 원인을 띄움) */}
  {apiError && (
    <div className="error-banner">
      <span>🚨 Vercel 서버 통신 에러 발생! 아래 원인을 확인하세요.</span>
      <span style={{ fontSize: 13, fontWeight: 400 }}>{apiError}</span>
    </div>
  )}
  {demo && !apiError && <div className="demo-banner">API 연결이 감지되지 않아 데모 데이터로 구동 중입니다.</div>}

  <header className="header">
    <div className="header-top">
      <div className="title-area">
        <span>JOB ALIO</span>
        <h1>대전·창원 채용 달력</h1>
      </div>
    </div>
    <div className="filter-group">
      {["전체","대전","창원"].map(v => <button key={v} className={`filter-btn ${lf===v?"active":""}`} onClick={() => setLf(v)}>{v}</button>)}
      <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 4px" }}/>
      {["전체","청년인턴","정규직"].map(v => <button key={v} className={`filter-btn ${tf===v?"active":""}`} onClick={() => setTf(v)}>{v}</button>)}
    </div>
  </header>

  <div className="mobile-tabs">
    <div className={`tab ${tab==="calendar"?"active":""}`} onClick={()=>setTab("calendar")}>캘린더</div>
    <div className={`tab ${tab==="list"?"active":""}`} onClick={()=>setTab("list")}>공고 목록</div>
  </div>

  <main className="main-grid">
    <section className="calendar-section">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={pv}>‹</button>
        <div className="cal-title">{MO[mo]}<span>{yr}</span></div>
        <button className="cal-nav-btn" onClick={nx}>›</button>
      </div>

      <div className="cal-grid">
        {DAYS_KR.map((d, i) => <div key={d} className={`cal-day-header ${i===0?'sun':i===6?'sat':''}`}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dj = jfd(ds);
          const isT = ds === ts;
          const isS = sel?.ds === ds;
          const dow = (FD + day - 1) % 7;
          
          return (
            <div key={day} className={`cal-cell ${isT?'today':''} ${isS?'selected':''}`} onClick={() => click(day)}>
              <span className={`date-num ${dow===0?'sun':dow===6?'sat':''}`}>{day}</span>
              <div className="dots-wrap">
                {dj.slice(0, 5).map((job, k) => <div key={k} className="dot" style={{ background: job.type === "청년인턴" ? "#10b981" : "#3b82f6" }}/>)}
                {dj.length > 5 && <span style={{fontSize:10, color:'#9ca3af', fontWeight:'bold'}}>+</span>}
              </div>
            </div>
          );
        })}
      </div>

      {pn && sel && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#111827" }}>
            {mo+1}월 {sel.day}일 <span style={{ color: "#3b82f6", fontSize: 16 }}>({sel.jobs.length}건)</span>
          </h3>
          {sel.jobs.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#9ca3af" }}>해당 날짜에 일정이 없습니다.</div>
          ) : (
            sel.jobs.map(job => <JobCard key={job.id} job={job} showCheck={true} />)
          )}
        </div>
      )}
    </section>

    <section className="list-section">
      <div className="list-header">
        <span>현재 진행중인 공고</span>
        <span style={{ fontSize: 14, color: "#6b7280" }}>총 {act.length}건</span>
      </div>
      <div className="scroll-area">
        {act.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#9ca3af" }}>조건에 맞는 공고가 없습니다.</div>
        ) : (
          act.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)).map(job => <JobCard key={job.id} job={job} showCheck={true} />)
        )}
      </div>
    </section>
  </main>
  </div>
  );
}