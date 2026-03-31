// ============================================================
// Vercel Serverless Function: /api/jobs
// 잡알리오 opendata.alio.go.kr 채용정보 목록 API 연동
// 대전(R3012)/경남-창원(R3022) + 청년인턴/기계직 필터링
// ============================================================

let cachedData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1시간

// 코드 정의서 기반 상수
const WORK_REGION = {
  R3012: "대전",
  R3022: "경남",
};
const HIRE_TYPE_INTERN = ["R1050", "R1060", "R1070"]; // 청년인턴, 체험형, 채용형
const HIRE_TYPE_REGULAR = ["R1010"];                    // 정규직
const NCS_MECHANICAL = "R600015";                       // 기계

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const now = Date.now();
    if (cachedData && now - cacheTimestamp < CACHE_TTL) {
      return res.status(200).json({
        success: true,
        cached: true,
        lastUpdated: new Date(cacheTimestamp).toISOString(),
        count: cachedData.length,
        data: cachedData,
      });
    }

    const API_KEY = process.env.ALIO_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "환경변수 ALIO_API_KEY가 설정되지 않았습니다.",
      });
    }

    // ── 전체 공고 수집 (페이징) ──
    const BASE = "https://opendata.alio.go.kr/new/v1/recruit/list.do";
    let allItems = [];
    let pageNo = 1;
    let totalCount = Infinity;

    while (allItems.length < totalCount && pageNo <= 20) {
      const url = `${BASE}?serviceKey=${encodeURIComponent(API_KEY)}&numOfRows=100&pageNo=${pageNo}&resultType=json`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(15000),
      });

      const text = await resp.text();

      // XML 에러 체크 (공공데이터포털 특성)
      if (text.startsWith("<")) {
        console.error("XML error response:", text.substring(0, 300));
        break;
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("JSON parse failed:", text.substring(0, 200));
        break;
      }

      // 에러 코드 체크
      const code = String(json.resultCode);
      if (code !== "0" && code !== "200") {
        console.error(`API error: ${json.resultCode} - ${json.resultMsg}`);
        // 데이터 없음(3)은 정상 종료
        if (code === "3") break;
        break;
      }

      totalCount = json.totalCount || 0;
      const items = json.result || [];

      if (Array.isArray(items)) {
        allItems.push(...items);
      } else if (items && typeof items === "object") {
        allItems.push(items);
      }

      if (items.length === 0) break;
      pageNo++;
    }

    // ── 필터링: 대전/경남(창원) + 청년인턴 or 기계직 ──
    const filtered = allItems
      .filter((item) => {
        const regions = String(item.workRgnLst || "");
        const regionNames = String(item.workRgnNmLst || "");
        const title = String(item.recrutPbancTtl || "");

        // 1) 근무지: 대전(R3012) 또는 경남(R3022)
        const isDaejeon = regions.includes("R3012") || regionNames.includes("대전");
        const isGyeongnam = regions.includes("R3022") || regionNames.includes("경남") || regionNames.includes("창원");
        if (!isDaejeon && !isGyeongnam) return false;

        // 2) 고용형태가 청년인턴이거나, NCS가 기계이거나, 제목에 관련 키워드
        const hireTypes = String(item.hireTypeLst || "");
        const hireNames = String(item.hireTypeNmLst || "");
        const ncsCodes = String(item.ncsCdLst || "");
        const ncsNames = String(item.ncsCdNmLst || "");

        const isIntern =
          HIRE_TYPE_INTERN.some((c) => hireTypes.includes(c)) ||
          hireNames.includes("인턴");

        const isMechanical =
          ncsCodes.includes(NCS_MECHANICAL) ||
          ncsNames.includes("기계") ||
          title.includes("기계");

        return isIntern || isMechanical;
      })
      .map((item) => {
        const regions = String(item.workRgnLst || "");
        const regionNames = String(item.workRgnNmLst || "");
        const hireTypes = String(item.hireTypeLst || "");
        const hireNames = String(item.hireTypeNmLst || "");
        const ncsCodes = String(item.ncsCdLst || "");

        // 지역 판별
        const isDaejeon = regions.includes("R3012") || regionNames.includes("대전");
        const location = isDaejeon ? "대전" : "창원";

        // 유형 판별
        const isIntern =
          HIRE_TYPE_INTERN.some((c) => hireTypes.includes(c)) ||
          hireNames.includes("인턴");

        const type = isIntern ? "청년인턴" : "정규직";

        // 하위유형 세분화
        let subType = "";
        if (isIntern) {
          if (hireTypes.includes("R1060")) subType = "체험형";
          else if (hireTypes.includes("R1070")) subType = "채용형";
        }

        return {
          id: item.recrutPblntSn || 0,
          company: item.instNm || "",
          title: item.recrutPbancTtl || "",
          type,
          subType,
          category: ncsCodes.includes(NCS_MECHANICAL) ? "기계" : (item.ncsCdNmLst || ""),
          location,
          address: item.workRgnNmLst || "",
          startDate: normDate(item.pbancBgngYmd),
          endDate: normDate(item.pbancEndYmd),
          people: parseInt(item.recrutNope) || 0,
          url: item.srcUrl || `https://job.alio.go.kr/recruit.do`,
          ongoing: item.ongoingYn === "Y",
          recruitType: item.recrutSeNm || "",
        };
      });

    cachedData = filtered;
    cacheTimestamp = now;

    return res.status(200).json({
      success: true,
      cached: false,
      lastUpdated: new Date(now).toISOString(),
      totalFetched: allItems.length,
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    console.error("Handler error:", err);

    // 캐시가 있으면 stale 데이터라도 반환
    if (cachedData) {
      return res.status(200).json({
        success: true,
        cached: true,
        stale: true,
        lastUpdated: new Date(cacheTimestamp).toISOString(),
        count: cachedData.length,
        data: cachedData,
      });
    }

    return res.status(500).json({ success: false, error: err.message });
  }
}

function normDate(d) {
  if (!d) return "";
  const s = String(d).replace(/[.\-/\s]/g, "");
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return String(d).slice(0, 10);
  return String(d);
}
