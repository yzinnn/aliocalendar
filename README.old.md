# 잡알리오 채용 달력 - 배포 가이드

대전/창원 근무지의 청년인턴·기계직 공고를 달력에 표시하는 앱

## API 연동 확정 사항

잡알리오 오픈데이터 API (opendata.alio.go.kr) 기반

**엔드포인트:** `POST https://opendata.alio.go.kr/new/v1/recruit/list.do`

**필터링 코드 (코드정의서 v1.2 기반):**
| 구분 | 코드 | 의미 |
|------|------|------|
| 근무지-대전 | R3012 | 대전 |
| 근무지-경남 | R3022 | 경남(창원 포함) |
| 고용형태-청년인턴 | R1050 | 청년인턴 |
| 고용형태-체험형 | R1060 | 청년인턴(체험형) |
| 고용형태-채용형 | R1070 | 청년인턴(채용형) |
| 고용형태-정규직 | R1010 | 정규직 |
| NCS-기계 | R600015 | 기계 |

**응답 필드 매핑:**
| 필드 | 설명 |
|------|------|
| instNm | 기관명 |
| recrutPbancTtl | 채용공고 제목 |
| pbancBgngYmd | 공고 시작일 |
| pbancEndYmd | 공고 마감일 |
| hireTypeLst | 고용형태 코드 (콤마 구분) |
| hireTypeNmLst | 고용형태명 |
| ncsCdLst | NCS 직무 코드 |
| ncsCdNmLst | NCS 직무명 |
| workRgnLst | 근무지 코드 |
| workRgnNmLst | 근무지명 |
| recrutNope | 모집인원 |
| srcUrl | 원문 URL |
| recrutPblntSn | 공고 일련번호 |
| ongoingYn | 진행중 여부 (Y/N) |

---

## 배포 순서

### 1. 백엔드 (Vercel)

```bash
cd backend

# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경변수 등록 (공공데이터포털에서 발급받은 키)
vercel env add ALIO_API_KEY
# → 키 값 붙여넣기

# 프로덕션 배포
vercel --prod
```

배포 후 나오는 URL 기억 (예: `https://job-alio-api.vercel.app`)

### 2. 프론트엔드

`job-alio-calendar.jsx` 상단의 `API_URL`을 위 Vercel URL로 교체:
```javascript
const API_URL = "https://job-alio-api.vercel.app/api/jobs";
```

#### Google Cloud Storage 배포:
```bash
# React 프로젝트 생성
npx create-react-app job-alio
cd job-alio

# src/App.jsx를 job-alio-calendar.jsx로 교체
# build
npm run build

# GCS 배포
gsutil mb gs://job-alio-calendar
gsutil web set -m index.html -e index.html gs://job-alio-calendar
gsutil -m cp -r build/* gs://job-alio-calendar/
gsutil iam ch allUsers:objectViewer gs://job-alio-calendar
```

#### 또는 Firebase Hosting (더 간단):
```bash
npm i -g firebase-tools
firebase init hosting  # public → build
firebase deploy
```

---

## 주의사항

1. **API 키 재발급 필수**: Swagger UI 테스트 시 키가 채팅에 노출되었으므로
   공공데이터포털 마이페이지에서 키를 재발급하세요.

2. **Vercel Cron**: Free 플랜은 일 1회, Pro 플랜은 원하는 빈도 가능.
   현재 매일 00:00 UTC (= 09:00 KST)로 설정됨.

3. **list API 호출 시 서버 에러가 나는 경우**:
   - serviceKey가 URL 인코딩이 이중으로 된 건 아닌지 확인
   - Swagger에서 테스트할 때 serviceKey에 키 값만 깔끔하게 넣기
   - `swaggerType: Y` 헤더는 Swagger 전용이므로 실제 호출 시 불필요

4. **경남 = 창원**: 잡알리오는 시/도 단위(R3022=경남)로만 구분하므로
   경남 전체 공고가 포함됩니다. 창원만 정밀 필터링하려면
   상세조회(detail)에서 주소 확인이 추가로 필요합니다.

## 파일 구조

```
backend/
  api/jobs.js      ← Vercel serverless (잡알리오 API 호출+필터링)
  vercel.json      ← Vercel 설정 + cron
  package.json

job-alio-calendar.jsx  ← React 프론트엔드
```
