# 데이터베이스 설정 가이드

## 1. 환경 변수 설정

`backend` 폴더에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# 데이터베이스 연결 정보
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# API 설정
API_HOST=0.0.0.0
API_PORT=8000
```

## 2. 데이터베이스 연결 테스트

서버 실행 후 다음 URL로 데이터베이스 연결을 테스트할 수 있습니다:

```
http://localhost:8000/api/database/test
```

## 3. 기능 설명

### 데이터베이스 쿠폰 (읽기 전용)
- 실제 데이터베이스에서 가져온 쿠폰들
- 조회만 가능하며 수정/삭제/사용 처리 불가
- ID가 10000 미만

### 임시 쿠폰 (완전 관리)
- 새로 추가한 쿠폰들
- 수정/삭제/사용 처리 모두 가능
- ID가 10000 이상

## 4. SQL 쿼리

다음 쿼리가 실행됩니다:

```sql
SELECT
    a.id,
    a.code_value as 쿠폰코드,
    a.title as 쿠폰명,
    a.dc_amount as 할인금액,
    a.dc_rate as 할인율,
    a.date_expired as 유효기간,
    b.name as 매장명,
    c.name as 제공업체명,
    a.standard_price as 기준금액,
    e.name as 쿠폰등록회원명,
    CASE 
        WHEN d.user_id IS NOT NULL THEN true 
        ELSE false 
    END as used
FROM b_payment_bcoupon a
LEFT JOIN b_class_bplace b ON b.id = a.b_place_id
LEFT JOIN b_class_bprovider c ON a.b_provider_id = c.id
LEFT JOIN b_payment_bcouponuser d ON d.b_coupon_id = a.id
LEFT JOIN user_user e ON d.user_id = e.id
WHERE a.title LIKE '%팀버핏%'
ORDER BY a.date_expired DESC
```

## 5. 오류 처리

데이터베이스 연결이 실패하면 기본 샘플 데이터가 표시됩니다. 