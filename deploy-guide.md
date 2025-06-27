# 🚀 쿠폰 트래커 실서버 배포 가이드

## 📋 배포 개요
- **프론트엔드**: Vercel (React 앱)
- **백엔드**: Railway (FastAPI)
- **데이터베이스**: Railway PostgreSQL

## 🔧 1. 백엔드 배포 (Railway)

### 1.1 Railway 계정 생성
1. [Railway.app](https://railway.app) 접속
2. GitHub 계정으로 로그인
3. 새 프로젝트 생성

### 1.2 데이터베이스 설정
1. Railway 대시보드에서 "Add PostgreSQL" 클릭
2. 데이터베이스 연결 정보 복사 (DATABASE_URL)

### 1.3 백엔드 환경 변수 설정
```env
DATABASE_URL=postgresql://user:password@host:port/database
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

### 1.4 Railway 배포 설정
1. GitHub 리포지토리 연결
2. 루트 디렉토리를 `backend`로 설정
3. 빌드 명령어: `pip install -r requirements.txt`
4. 시작 명령어: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## 🎨 2. 프론트엔드 배포 (Vercel)

### 2.1 Vercel 계정 생성
1. [Vercel.com](https://vercel.com) 접속
2. GitHub 계정으로 로그인

### 2.2 프로젝트 배포
1. "New Project" 클릭
2. GitHub 리포지토리 선택
3. 루트 디렉토리를 `frontend`로 설정
4. 빌드 설정:
   - Build Command: `npm run build`
   - Output Directory: `build`

### 2.3 환경 변수 설정
```env
REACT_APP_API_URL=https://your-backend-domain.railway.app
```

## 🔒 3. 보안 설정

### 3.1 CORS 설정
백엔드에서 프론트엔드 도메인 허용:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.2 환경 변수 보안
- 데이터베이스 비밀번호
- API 키
- JWT 시크릿

## 📊 4. 데이터베이스 마이그레이션

### 4.1 기존 데이터 백업
```bash
# 로컬 데이터베이스 백업
mysqldump -u root -p coupon_tracker > backup.sql
```

### 4.2 PostgreSQL로 데이터 이전
```bash
# CSV 내보내기 후 PostgreSQL에 임포트
```

## 🚀 5. 배포 자동화 (선택사항)

### 5.1 GitHub Actions 설정
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: railway deploy
```

## 📈 6. 모니터링 및 로깅

### 6.1 Railway 로그 확인
- Railway 대시보드에서 실시간 로그 확인
- 에러 모니터링 설정

### 6.2 Vercel 분석
- 트래픽 분석
- 성능 모니터링

## 🔧 7. 도메인 설정 (선택사항)

### 7.1 커스텀 도메인
1. 도메인 구매 (가비아, 후이즈 등)
2. Vercel/Railway에서 도메인 연결
3. SSL 인증서 자동 설정

## 💰 8. 비용 예상

### 무료 티어
- **Vercel**: 무료 (개인 프로젝트)
- **Railway**: $5/월 (데이터베이스 포함)

### 유료 업그레이드 시
- **Vercel Pro**: $20/월
- **Railway Pro**: $20/월

## 🆘 9. 트러블슈팅

### 자주 발생하는 문제들
1. **CORS 에러**: 백엔드에서 프론트엔드 도메인 허용 확인
2. **데이터베이스 연결 실패**: 환경 변수 확인
3. **빌드 실패**: 의존성 버전 확인

## 📞 10. 지원

배포 중 문제가 발생하면:
1. Railway/Vercel 공식 문서 확인
2. GitHub Issues 활용
3. 커뮤니티 포럼 참고 