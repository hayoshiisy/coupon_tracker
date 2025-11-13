# Railway 환경 변수 설정 가이드

이 문서는 Railway에서 데이터베이스 연결을 위한 환경 변수를 설정하는 방법을 안내합니다.

## 필수 환경 변수

Railway 프로젝트에서 다음 환경 변수들을 설정해야 합니다:

### 1. 메인 서비스 DB 연결 정보 (config.py에서 사용)

Railway 대시보드 > 프로젝트 > Variables에서 다음 변수들을 추가하세요:

```
DB_HOST=butfitseoul-replica.cjilul7too7t.ap-northeast-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=master_20221217
DB_USER=syha
DB_PASSWORD=eteigeegha4Ungohteibahchohthoh6n
```

### 2. 발행자 DB 연결 정보 (issuer_database.py에서 사용)

Railway는 PostgreSQL 서비스를 추가하면 자동으로 `DATABASE_URL` 환경 변수를 제공합니다.
만약 별도의 PostgreSQL 서비스를 사용한다면:

```
DATABASE_URL=postgresql://postgres:password@host:port/database
```

**주의**: Railway에서 PostgreSQL 서비스를 추가하면 자동으로 `DATABASE_URL`이 설정되므로, 별도로 설정할 필요가 없습니다.

### 3. 기타 서버 설정

```
PORT=8000
CORS_ORIGINS=https://coupon-tracker.vercel.app
JWT_SECRET_KEY=your-secret-key-here
```

## Railway에서 환경 변수 설정 방법

1. Railway 대시보드에 로그인
2. 프로젝트 선택
3. **Variables** 탭 클릭
4. **New Variable** 버튼 클릭
5. 변수 이름과 값을 입력
6. **Add** 클릭

## 보안 주의사항

- ✅ 환경 변수는 Railway 대시보드에서만 설정하세요
- ✅ `.env` 파일은 Git에 커밋하지 마세요 (이미 .gitignore에 추가됨)
- ✅ 코드에 비밀번호를 하드코딩하지 마세요
- ✅ 로그 파일에 비밀번호가 포함되지 않도록 마스킹 처리됨

## 환경 변수 확인

배포 후 다음 엔드포인트로 환경 변수가 제대로 설정되었는지 확인할 수 있습니다:

```
GET /api/debug/env
```

## 문제 해결

### 환경 변수가 설정되지 않았다는 에러가 발생하는 경우

1. Railway 대시보드에서 Variables 탭 확인
2. 필수 환경 변수들이 모두 설정되어 있는지 확인
3. 서비스 재배포 (Railway는 환경 변수 변경 시 자동 재배포)

### 데이터베이스 연결 실패

1. `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` 확인
2. Railway PostgreSQL 서비스의 `DATABASE_URL` 확인
3. 방화벽 설정 확인 (RDS의 경우)

