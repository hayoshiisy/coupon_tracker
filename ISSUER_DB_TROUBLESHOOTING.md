# Issuer 데이터베이스 문제 해결 가이드

## 문제 증상
- `/admin` 페이지에서 issuer 관련 데이터가 로드되지 않음
- API 응답이 빈 배열을 반환

## 원인 분석

Issuer 데이터베이스는 Railway의 PostgreSQL을 사용하며, `DATABASE_URL` 환경 변수를 통해 연결합니다.

가능한 원인:
1. **Railway에서 `DATABASE_URL` 환경 변수가 설정되지 않음**
2. **`DATABASE_URL`이 잘못된 값으로 설정됨**
3. **PostgreSQL 서비스가 Railway에 추가되지 않음**
4. **데이터베이스 연결 실패 또는 테이블 생성 실패**

## 해결 방법

### 1단계: Railway 환경 변수 확인

1. Railway 대시보드 접속
2. 프로젝트 선택
3. **Variables** 탭 클릭
4. `DATABASE_URL` 환경 변수가 있는지 확인

### 2단계: PostgreSQL 서비스 확인

1. Railway 프로젝트에서 **PostgreSQL 서비스가 추가되어 있는지** 확인
2. PostgreSQL 서비스가 없다면:
   - **+ New** 버튼 클릭
   - **Database** > **Add PostgreSQL** 선택
   - Railway가 자동으로 `DATABASE_URL` 환경 변수를 생성합니다

### 3단계: DATABASE_URL 설정

PostgreSQL 서비스를 추가하면 Railway가 자동으로 `DATABASE_URL`을 설정합니다.

만약 수동으로 설정해야 한다면:
1. PostgreSQL 서비스의 **Variables** 탭에서 `DATABASE_URL` 복사
2. 백엔드 서비스의 **Variables** 탭에서 `DATABASE_URL` 추가

**형식**: `postgresql://postgres:password@host:port/database`

### 4단계: 디버그 엔드포인트로 상태 확인

배포 후 다음 엔드포인트로 상태를 확인할 수 있습니다:

```
GET https://your-railway-app.railway.app/api/debug/env
```

응답에서 다음을 확인:
- `issuer_db_disabled`: `false`여야 함
- `issuer_db_database_url_set`: `true`여야 함
- `issuer_db_test.status`: `"success"`여야 함
- `issuer_db_test.reason`: 에러 메시지가 있다면 원인 확인

### 5단계: Railway 로그 확인

1. Railway 대시보드에서 백엔드 서비스 선택
2. **Deployments** 탭 > 최신 배포 선택
3. **Logs** 탭에서 다음 메시지 확인:
   - ✅ `PostgreSQL 데이터베이스 연결 성공`
   - ✅ `발행자 DB 초기화 완료`
   - ❌ `발행자 DB 비활성화: ...` (에러 메시지 확인)

## 예상되는 로그 메시지

### 정상 작동 시
```
INFO:issuer_database:PostgreSQL 데이터베이스 연결 시도: postgresql://postgres:***@...
INFO:issuer_database:PostgreSQL 데이터베이스 연결 성공
INFO:issuer_database:발행자 PostgreSQL 테이블이 성공적으로 생성되었습니다.
INFO:issuer_database:발행자 DB 초기화 완료
```

### 문제 발생 시
```
ERROR:issuer_database:발행자 DB 비활성화: DATABASE_URL 환경 변수가 설정되지 않았습니다.
ERROR:issuer_database:Railway 대시보드에서 DATABASE_URL 환경 변수를 설정해주세요.
```

또는

```
ERROR:issuer_database:발행자 DB 비활성화: 데이터베이스 연결 또는 테이블 생성 실패: ...
ERROR:issuer_database:Railway에서 DATABASE_URL이 올바른 PostgreSQL 연결 문자열인지 확인해주세요.
```

## 빠른 해결 체크리스트

- [ ] Railway에 PostgreSQL 서비스가 추가되어 있는가?
- [ ] 백엔드 서비스의 Variables에 `DATABASE_URL`이 설정되어 있는가?
- [ ] `DATABASE_URL` 형식이 올바른가? (`postgresql://...`)
- [ ] Railway 로그에 연결 성공 메시지가 있는가?
- [ ] `/api/debug/env` 엔드포인트에서 `issuer_db_disabled: false`인가?

## 추가 도움말

문제가 계속되면:
1. Railway 로그의 전체 에러 메시지 확인
2. `/api/debug/env` 엔드포인트 응답 확인
3. PostgreSQL 서비스가 정상 작동하는지 Railway에서 확인

