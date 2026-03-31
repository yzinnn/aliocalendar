let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000;

const HIRE_TYPE_INTERN = ["R1050", "R1060", "R1070"];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const forceRefresh = req.query.force === "true";

  try {
    const now = Date.now();
    if (!forceRefresh && cachedData && now - cacheTimestamp < CACHE_TTL) {
      return res.status(200).json({ success: true, cached: true, lastUpdated: new Date(cacheTimestamp).toISOString(), count: cachedData.length, data: cachedData });
    }

    const API_KEY = process.env.ALIO_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ success: false, error: "ALIO_API_KEY not set" });
    }

    const BASE = "https://opendata.alio.go.kr/new/v1/recruit/list.do";
    let allItems = [];
    let pageNo = 1;
    let totalCount = Infinity;

    while (allItems.length < totalCount && pageNo <= 30) {
      const url = `${BASE}?serviceKey=${encodeURIComponent(API_KEY)}&numOfRows=100&pageNo=${pageNo}&resultType=json`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(15000),
      });
      const text = await resp.text();
      if (text.startsWith("<")) break;

      let json;
      try { json = JSON.parse(text); } catch (e) { break; }

      const code = String(json.resultCode);
      if (code !== "0" && code !== "200") break;

      totalCount = json.totalCount || 0;
      const items = json.result || [];
      if (Array.isArray(items)) { allItems.push(...items); }
      else if (items && typeof items === "object") { allItems.push(items); }
      if (items.length === 0) break;
      pageNo++;
    }

    const filtered = allItems
      .filter((item) => {
        // 대전, 경남(창원 포함) 지역만 필터링
        const regions = String(item.workRgnLst || "");
        const regionNames = String(item.workRgnNmLst || "");
        const isDaejeon = regions.includes("R3012") || regionNames.includes("대전");
        const isGyeongnam = regions.includes("R3022") || regionNames.includes("경남") || regionNames.includes("창원") || regionNames.includes("진주");
        return isDaejeon || isGyeongnam;
      })
      .map((item) => {
        const regions = String(item.workRgnLst || "");
        const regionNames = String(item.workRgnNmLst || "");
        const hireTypes = String(item.hireTypeLst || "");
        const hireNames = String(item.hireTypeNmLst || "");
        const title = String(item.recrutPbancTtl || "");
        const ncsCodes = String(item.ncsCdLst || "");
        const ncsNames = String(item.ncsCdNmLst || "");

        const isDaejeon = regions.includes("R3012") || regionNames.includes("대전");
        const location = isDaejeon ? "대전" : "창원";

        // 기존 고용형태 분류 로직 유지
        let type = "정규직";
        if (HIRE_TYPE_INTERN.some((c) => hireTypes.includes(c)) || hireNames.includes("인턴") || title.includes("인턴")) {
          type = "청년인턴";
        } else if (
          hireTypes.includes("R1020") || 
          hireTypes.includes("R1040") || 
          hireNames.includes("계약") || 
          hireNames.includes("비정규") || 
          title.includes("기간제") || 
          title.includes("계약직") ||
          title.includes("촉탁")
        ) {
          type = "계약직";
        } else if (hireTypes.includes("R1030") || title.includes("무기계약")) {
          type = "무기계약직";
        }

        let subType = "";
        if (type === "청년인턴") {
          if (hireTypes.includes("R1060") || title.includes("체험")) subType = "체험형";
          else if (hireTypes.includes("R1070") || title.includes("채용형")) subType = "채용형";
        }

        // 기술직(기계 포함) 여부 판별 로직 추가
        const isMachine = ncsCodes.includes("R600015") || /기계|기술|설비|정비|엔지니어|플랜트/.test(title) || ncsNames.includes("기계");

        return {
          id: item.recrutPblntSn || 0,
          company: item.instNm || "",
          title: title,
          type,
          subType,
          isMachine, // 기술직 필터 플래그
          category: item.ncsCdNmLst || "",
          location,
          address: item.workRgnNmLst || "",
          startDate: normDate(item.pbancBgngYmd),
          endDate: normDate(item.pbancEndYmd),
          people: parseInt(item.recrutNope) || 0,
          url: item.srcUrl || `https://job.alio.go.kr/recruitView.do?recrutPblntSn=${item.recrutPblntSn}`,
          ongoing: item.ongoingYn === "Y",
          recruitType: item.recrutSeNm || "",
        };
      });

    cachedData = filtered;
    cacheTimestamp = now;

    return res.status(200).json({ success: true, cached: false, lastUpdated: new Date(now).toISOString(), count: filtered.length, data: filtered });
  } catch (err) {
    if (cachedData) {
      return res.status(200).json({ success: true, cached: true, stale: true, lastUpdated: new Date(cacheTimestamp).toISOString(), count: cachedData.length, data: cachedData });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

function normDate(d) {
  if (!d) return "";
  const s = String(d).replace(/[.\-/\s]/g, "");
  if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return String(d).slice(0,10);
  return String(d);
}