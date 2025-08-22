# 삼분과 상담·의뢰 포털 (MVP)

Express + SQLite 로 동작하는 심플한 3개 게시판 포털입니다.

## 구성
- **보드(3)**: `computer-quote` / `code-consult` / `ppt-request`
- **기능**
  - 글 작성(이름 선택, 제목, 내용)
  - 상태표시: `접수됨` → `처리중` → `완료`
  - 관리자 답변 (관리자 키 필요)
- **프론트**: 정적 HTML/CSS + Fetch API
- **백엔드**: Express + SQLite

## 빠른 시작
```bash
# 1) 의존성 설치
npm install

# 2) .env 준비(선택)
# 관리자 키 변경
echo "ADMIN_KEY=원하는_키" > .env

# 3) DB 초기화
npm run init:db

# 4) 서버 실행
npm run dev
# http://localhost:3000 접속
```

## API 개요
- `GET /api/boards` 보드 목록
- `GET /api/:board/posts` 해당 보드 글 리스트(+답변)
- `POST /api/:board/posts` 새 글 생성 `{ name?, title*, content* }`
- `PATCH /api/:board/posts/:id/status` 상태변경 `{ status }` (헤더 `x-admin-key` 필요)
- `POST /api/:board/posts/:id/replies` 답변 생성 `{ content, author? }` (헤더 `x-admin-key` 필요)

## 배포 팁
- **Render/Heroku/Railway** 등 무료 PaaS에 배포 가능
- 포트는 환경변수 `PORT` 사용
- SQLite 파일 `data.db`는 로컬 디스크에 저장됩니다. (단일 인스턴스 권장)

## 커스터마이징 아이디어
- 파일 업로드(예: multer + S3 호환 스토리지)
- 이메일/디스코드/슬랙 알림
- reCAPTCHA로 스팸 방지
- Next.js로 프론트 교체 및 SSR
- 사용자 알림용 비밀번호 없는 링크(매직링크)

행운을 빕니다! 🚀
