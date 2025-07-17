from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uvicorn
from datetime import datetime, timedelta
import logging
import os
import jwt
import hashlib
from database import db_service
from issuer_management import issuer_manager
from issuer_database import issuer_db_service

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="쿠폰 트래커 API", version="2.0.0")

# 환경 변수에서 CORS origins 가져오기
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
cors_origins = [origin.strip() for origin in cors_origins]

# JWT 설정
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# 보안 설정
security = HTTPBearer()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 확장된 쿠폰 모델
class Coupon(BaseModel):
    id: Optional[int] = None
    name: str
    discount: str
    expiration_date: str
    store: str
    status: str
    code: Optional[str] = None
    standard_price: Optional[int] = None
    registered_by: Optional[str] = None
    additional_info: Optional[str] = None
    payment_status: Optional[str] = None

# 페이지네이션 응답 모델
class PaginatedCoupons(BaseModel):
    coupons: List[Coupon]
    total: int
    page: int
    size: int
    total_pages: int

# 임시 데이터베이스 (메모리) - 새로운 쿠폰 추가용
temp_coupons_db: List[Coupon] = []
temp_counter = 10000  # DB 쿠폰과 구분하기 위해 큰 숫자부터 시작

# 새로운 모델 정의
class IssuerAuthRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    name: str

class IssuerAuthResponse(BaseModel):
    access_token: str
    token_type: str
    issuer_name: str
    expires_in: int

class IssuerProfile(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    total_coupons: int
    active_coupons: int
    expired_coupons: int

class IssuerRegistration(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = "쿠폰발행자"

class IssuerUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "쿠폰 트래커 API에 오신 것을 환영합니다! (DB 연동 버전)"}

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트 - Railway가 서버 상태를 확인하는 데 사용"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/health")
async def api_health_check():
    """API 헬스체크 엔드포인트"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/coupons")
async def get_coupons(
    search: str = Query(None, description="검색어"),
    coupon_names: str = Query(None, description="쿠폰명 필터 (쉼표로 구분)"),
    store_names: str = Query(None, description="지점명 필터 (쉼표로 구분)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(100, ge=1, le=1000, description="페이지 크기")
):
    """쿠폰 목록을 조회합니다."""
    try:
        # 필터 파라미터 처리
        coupon_name_list = None
        if coupon_names:
            coupon_name_list = [name.strip() for name in coupon_names.split(',')]
        
        store_name_list = None
        if store_names:
            store_name_list = [name.strip() for name in store_names.split(',')]
        
        # 데이터베이스에서 쿠폰 조회 (서버 사이드 페이지네이션 및 필터링)
        result = db_service.get_coupons_from_db(
            team_id=None,
            page=page,
            size=size,
            search=search,
            coupon_names=coupon_name_list,
            store_names=store_name_list
        )
        
        logger.info(f"페이지 {page}/{result['total_pages']} 조회: {len(result['coupons'])}개 쿠폰 (전체: {result['total']}개)")
        
        return {
            "coupons": result['coupons'],
            "total": result['total'],
            "page": result['page'],
            "size": result['size'],
            "total_pages": result['total_pages']
        }
        
    except Exception as e:
        logger.error(f"쿠폰 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰 조회에 실패했습니다")

@app.get("/api/coupons")
async def get_api_coupons(
    search: str = Query(None, description="검색어"),
    coupon_names: str = Query(None, description="쿠폰명 필터 (쉼표로 구분)"),
    store_names: str = Query(None, description="지점명 필터 (쉼표로 구분)"),
    issuer: str = Query(None, description="발행자 이메일 필터"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(100, ge=1, le=1000, description="페이지 크기"),
    team_id: str = Query(None, description="팀 ID")
):
    """쿠폰 목록을 조회합니다. (API 경로)"""
    try:
        # 필터 파라미터 처리
        coupon_name_list = None
        if coupon_names:
            coupon_name_list = [name.strip() for name in coupon_names.split(',')]
        
        store_name_list = None
        if store_names:
            store_name_list = [name.strip() for name in store_names.split(',')]
        
        # 데이터베이스에서 쿠폰 조회 (서버 사이드 페이지네이션 및 필터링)
        result = db_service.get_coupons_from_db(
            team_id=team_id,
            page=page,
            size=size,
            search=search,
            coupon_names=coupon_name_list,
            store_names=store_name_list,
            issuer=issuer
        )
        
        logger.info(f"팀 {team_id} - 페이지 {page}/{result['total_pages']} 조회: {len(result['coupons'])}개 쿠폰 (전체: {result['total']}개)")
        
        return {
            "coupons": result['coupons'],
            "total": result['total'],
            "page": result['page'],
            "size": result['size'],
            "total_pages": result['total_pages']
        }
        
    except Exception as e:
        logger.error(f"쿠폰 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰 조회에 실패했습니다")

@app.get("/coupon-names")
async def get_coupon_names():
    """쿠폰명 리스트를 반환합니다."""
    try:
        coupon_names = db_service.get_coupon_names_from_db()
        return {"coupon_names": coupon_names}
    except Exception as e:
        logger.error(f"쿠폰명 리스트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰명 리스트 조회에 실패했습니다.")

@app.get("/api/coupon-names")
async def get_api_coupon_names(team_id: str = Query(None, description="팀 ID")):
    """쿠폰명 리스트를 반환합니다. (API 경로)"""
    try:
        coupon_names = db_service.get_coupon_names_from_db(team_id)
        return {"coupon_names": coupon_names}
    except Exception as e:
        logger.error(f"쿠폰명 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰명 조회에 실패했습니다")

@app.get("/api/teams/{team_id}/coupon-names")
async def get_team_coupon_names(team_id: str):
    """팀별 쿠폰명 리스트를 반환합니다."""
    try:
        coupon_names = db_service.get_coupon_names_from_db(team_id)
        return {"coupon_names": coupon_names}
    except Exception as e:
        logger.error(f"팀 {team_id} 쿠폰명 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"팀 {team_id} 쿠폰명 조회에 실패했습니다")

@app.get("/stores")
async def get_stores():
    """지점명 리스트를 반환합니다."""
    try:
        store_names = db_service.get_stores_from_db()
        return {"stores": store_names}
    except Exception as e:
        logger.error(f"지점명 리스트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="지점명 리스트 조회에 실패했습니다.")

@app.get("/api/stores")
async def get_api_stores(team_id: str = Query(None, description="팀 ID")):
    """지점명 리스트를 반환합니다. (API 경로)"""
    try:
        stores = db_service.get_stores_from_db(team_id)
        return {"stores": stores}
    except Exception as e:
        logger.error(f"지점명 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="지점명 조회에 실패했습니다")

@app.get("/api/teams/{team_id}/stores")
async def get_team_stores(team_id: str):
    """팀별 지점명 리스트를 반환합니다."""
    try:
        stores = db_service.get_stores_from_db(team_id)
        return {"stores": stores}
    except Exception as e:
        logger.error(f"팀 {team_id} 지점명 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"팀 {team_id} 지점명 조회에 실패했습니다")

@app.post("/api/coupons", response_model=Coupon)
async def create_coupon(coupon: Coupon):
    """새 쿠폰을 임시 저장소에 추가합니다."""
    global temp_counter
    coupon.id = temp_counter
    temp_counter += 1
    temp_coupons_db.append(coupon)
    logger.info(f"새 쿠폰 추가: {coupon.name}")
    return coupon

@app.put("/api/coupons/{coupon_id}", response_model=Coupon)
async def update_coupon(coupon_id: int, coupon: Coupon):
    """쿠폰을 수정합니다. (임시 저장소의 쿠폰만 수정 가능)"""
    # 임시 저장소에서 쿠폰 찾기
    for i, existing_coupon in enumerate(temp_coupons_db):
        if existing_coupon.id == coupon_id:
            coupon.id = coupon_id
            temp_coupons_db[i] = coupon
            logger.info(f"쿠폰 수정: {coupon.name}")
            return coupon
    
    # DB 쿠폰은 수정할 수 없음을 알림
    if coupon_id < 10000:
        raise HTTPException(status_code=400, detail="데이터베이스의 쿠폰은 수정할 수 없습니다.")
    
    raise HTTPException(status_code=404, detail="쿠폰을 찾을 수 없습니다")

@app.delete("/api/coupons/{coupon_id}")
async def delete_coupon(coupon_id: int):
    """쿠폰을 삭제합니다. (임시 저장소의 쿠폰만 삭제 가능)"""
    # 임시 저장소에서 쿠폰 찾기
    for i, coupon in enumerate(temp_coupons_db):
        if coupon.id == coupon_id:
            deleted_coupon = temp_coupons_db.pop(i)
            logger.info(f"쿠폰 삭제: {deleted_coupon.name}")
            return {"message": "쿠폰이 삭제되었습니다"}
    
    # DB 쿠폰은 삭제할 수 없음을 알림
    if coupon_id < 10000:
        raise HTTPException(status_code=400, detail="데이터베이스의 쿠폰은 삭제할 수 없습니다.")
    
    raise HTTPException(status_code=404, detail="쿠폰을 찾을 수 없습니다")

@app.patch("/api/coupons/{coupon_id}/use")
async def use_coupon(coupon_id: int):
    """쿠폰을 사용 처리합니다. (임시 저장소의 쿠폰만 사용 처리 가능)"""
    # 임시 저장소에서 쿠폰 찾기
    for coupon in temp_coupons_db:
        if coupon.id == coupon_id:
            coupon.used = True
            logger.info(f"쿠폰 사용: {coupon.name}")
            return coupon
    
    # DB 쿠폰은 사용 처리할 수 없음을 알림
    if coupon_id < 10000:
        raise HTTPException(status_code=400, detail="데이터베이스의 쿠폰은 사용 처리할 수 없습니다.")
    
    raise HTTPException(status_code=404, detail="쿠폰을 찾을 수 없습니다")

@app.patch("/api/coupons/{coupon_id}/registered-by")
async def update_coupon_registered_by(coupon_id: int, request: dict):
    try:
        registered_by = request.get('registered_by')
        if not registered_by:
            raise HTTPException(status_code=400, detail="registered_by가 필요합니다.")
        
        success = db_service.update_coupon_registered_by(coupon_id, registered_by)
        if success:
            logger.info(f"쿠폰 {coupon_id}의 등록자명이 '{registered_by}'로 업데이트되었습니다.")
            return {"message": "쿠폰 등록자명이 성공적으로 업데이트되었습니다."}
        else:
            raise HTTPException(status_code=400, detail="쿠폰 등록자명 업데이트에 실패했습니다.")
    except Exception as e:
        logger.error(f"쿠폰 등록자명 업데이트 오류: {e}")
        raise HTTPException(status_code=500, detail="서버 오류가 발생했습니다.")

@app.patch("/api/coupons/{coupon_id}/assign-issuer")
async def assign_coupon_issuer(coupon_id: int, request: dict):
    """쿠폰을 발행자에게 할당합니다."""
    try:
        issuer_email = request.get('issuer_email')
        issuer_name = request.get('issuer_name', issuer_email)  # 이름이 없으면 이메일 사용
        
        if not issuer_email:
            raise HTTPException(status_code=400, detail="issuer_email이 필요합니다.")
        
        # 발행자에게 쿠폰 할당
        success = issuer_db_service.assign_coupon_to_issuer(
            name=issuer_name,
            coupon_id=coupon_id,
            email=issuer_email
        )
        
        if success:
            logger.info(f"쿠폰 {coupon_id}가 발행자 '{issuer_email}'에게 할당되었습니다.")
            return {"message": f"쿠폰이 발행자 '{issuer_email}'에게 성공적으로 할당되었습니다."}
        else:
            raise HTTPException(status_code=400, detail="쿠폰 할당에 실패했습니다.")
            
    except Exception as e:
        logger.error(f"쿠폰 발행자 할당 오류: {e}")
        raise HTTPException(status_code=500, detail="서버 오류가 발생했습니다.")

@app.get("/api/statistics")
async def get_statistics():
    """쿠폰 통계 정보를 반환합니다."""
    try:
        # 데이터베이스에서 모든 쿠폰 조회
        result = db_service.get_coupons_from_db(team_id=None, page=1, size=10000)
        all_coupons = result['coupons']
        
        # 지점별, 쿠폰명별 통계 집계
        statistics = {}
        
        for coupon in all_coupons:
            store = coupon.get('store', '기타')
            coupon_name = coupon.get('name', '알 수 없음')
            payment_status = coupon.get('payment_status', '미결제')
            registered_by = coupon.get('registered_by', '미등록')
            
            # 지점별 그룹 생성
            if store not in statistics:
                statistics[store] = {}
            
            # 쿠폰명별 그룹 생성
            if coupon_name not in statistics[store]:
                statistics[store][coupon_name] = {
                    'coupon_name': coupon_name,
                    'total_count': 0,
                    'registered_count': 0,
                    'payment_completed_count': 0,
                    'registration_rate': 0.0,
                    'payment_rate': 0.0
                }
            
            # 발행 수량 증가
            statistics[store][coupon_name]['total_count'] += 1
            
            # 등록된 쿠폰 수량 증가 (registered_by가 '미등록'이 아닌 경우)
            if registered_by != '미등록':
                statistics[store][coupon_name]['registered_count'] += 1
            
            # 결제완료된 쿠폰 수량 증가 (payment_status가 '결제완료'인 경우)
            if payment_status == '결제완료':
                statistics[store][coupon_name]['payment_completed_count'] += 1
        
        # 비율 계산
        for store in statistics:
            for coupon_name in statistics[store]:
                coupon_data = statistics[store][coupon_name]
                total_count = coupon_data['total_count']
                
                if total_count > 0:
                    coupon_data['registration_rate'] = round(
                        (coupon_data['registered_count'] / total_count) * 100, 1
                    )
                    coupon_data['payment_rate'] = round(
                        (coupon_data['payment_completed_count'] / total_count) * 100, 1
                    )
        
        # 결과를 리스트 형태로 변환하고 매장별 전체 통계 계산
        result = []
        for store, coupon_data in statistics.items():
            # 매장별 전체 통계 계산
            total_issued = sum(coupon['total_count'] for coupon in coupon_data.values())
            total_registered = sum(coupon['registered_count'] for coupon in coupon_data.values())
            total_payment_completed = sum(coupon['payment_completed_count'] for coupon in coupon_data.values())
            
            overall_registration_rate = round((total_registered / total_issued) * 100, 1) if total_issued > 0 else 0.0
            overall_payment_rate = round((total_payment_completed / total_issued) * 100, 1) if total_issued > 0 else 0.0
            
            store_stats = {
                'store': store,
                'coupons': list(coupon_data.values()),
                'total_issued': total_issued,
                'total_registered': total_registered,
                'total_payment_completed': total_payment_completed,
                'overall_registration_rate': overall_registration_rate,
                'overall_payment_rate': overall_payment_rate
            }
            result.append(store_stats)
        
        # 지점명으로 정렬
        result.sort(key=lambda x: x['store'])
        
        return {"statistics": result}
        
    except Exception as e:
        logger.error(f"통계 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="통계 조회에 실패했습니다")

@app.get("/api/database/test")
async def test_database_connection():
    """데이터베이스 연결 테스트"""
    try:
        coupons = db_service.get_coupons_from_db()
        return {
            "status": "success",
            "message": "데이터베이스 연결 성공",
            "coupon_count": len(coupons)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"데이터베이스 연결 실패: {str(e)}"
        }

@app.get("/api/teams/{team_id}/coupons")
async def get_team_coupons(
    team_id: str,
    search: str = Query(None, description="검색어"),
    coupon_names: str = Query(None, description="쿠폰명 필터 (쉼표로 구분)"),
    store_names: str = Query(None, description="지점명 필터 (쉼표로 구분)"),
    issuer: str = Query(None, description="발행자 이메일 필터"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(100, ge=1, le=1000, description="페이지 크기")
):
    """팀별 쿠폰 목록을 조회합니다."""
    try:
        # 필터 파라미터 처리
        coupon_name_list = None
        if coupon_names:
            coupon_name_list = [name.strip() for name in coupon_names.split(',')]
        
        store_name_list = None
        if store_names:
            store_name_list = [name.strip() for name in store_names.split(',')]
        
        # 데이터베이스에서 팀별 쿠폰 조회 (서버 사이드 페이지네이션 및 필터링)
        result = db_service.get_coupons_from_db(
            team_id=team_id,
            page=page,
            size=size,
            search=search,
            coupon_names=coupon_name_list,
            store_names=store_name_list,
            issuer=issuer
        )
        
        logger.info(f"팀 {team_id} - 페이지 {page}/{result['total_pages']} 조회: {len(result['coupons'])}개 쿠폰 (전체: {result['total']}개)")
        
        return {
            "coupons": result['coupons'],
            "total": result['total'],
            "page": result['page'],
            "size": result['size'],
            "total_pages": result['total_pages']
        }
        
    except Exception as e:
        logger.error(f"팀 {team_id} 쿠폰 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"팀 {team_id} 쿠폰 조회에 실패했습니다")

@app.get("/api/teams/{team_id}/statistics")
async def get_team_statistics(team_id: str):
    try:
        # 통계용으로는 모든 데이터를 한 번에 가져오되, 필터링 없이 조회
        result = db_service.get_coupons_from_db(team_id=team_id, page=1, size=10000)
        coupons = result['coupons']
        
        # 지점별 통계 (기존 유지)
        store_stats = {}
        for coupon in coupons:
            store = coupon['store']
            if store not in store_stats:
                store_stats[store] = {'total': 0, 'used': 0, 'available': 0, 'expired': 0}
            
            store_stats[store]['total'] += 1
            if coupon['status'] == '사용완료':
                store_stats[store]['used'] += 1
            elif coupon['status'] == '사용가능':
                store_stats[store]['available'] += 1
            elif coupon['status'] == '만료':
                store_stats[store]['expired'] += 1
        
        # 지점별 쿠폰명 그룹화 및 쿠폰명별 집계
        store_coupon_stats = {}
        coupon_name_stats = {}
        
        # 전체 통계를 위한 변수들
        total_issued_count = 0
        total_registered_users = set()
        total_payment_completed = 0
        
        for coupon in coupons:
            store = coupon['store']
            coupon_name = coupon['name']
            payment_status = coupon.get('payment_status', '')
            registered_by = coupon.get('registered_by', '')
            
            # 지점별 쿠폰명 저장
            if store not in store_coupon_stats:
                store_coupon_stats[store] = set()
            store_coupon_stats[store].add(coupon_name)
            
            # 쿠폰명별 집계
            if coupon_name not in coupon_name_stats:
                coupon_name_stats[coupon_name] = {
                    'issued_count': 0,  # 발행된 쿠폰수
                    'registered_users': set(),  # 등록한 유저 (중복 제거를 위해 set 사용)
                    'payment_completed_count': 0  # 결제완료 수
                }
            
            # 발행된 쿠폰수 증가
            coupon_name_stats[coupon_name]['issued_count'] += 1
            total_issued_count += 1
            
            # 등록한 유저 추가 (registered_by가 있고 공백이 아닌 경우)
            if registered_by and registered_by.strip() and registered_by.strip() != '미등록':
                coupon_name_stats[coupon_name]['registered_users'].add(registered_by.strip())
                total_registered_users.add(registered_by.strip())
            
            # 결제완료 수 증가
            if payment_status == '결제완료':
                coupon_name_stats[coupon_name]['payment_completed_count'] += 1
                total_payment_completed += 1
        
        # 전체 통계 계산
        total_registered_users_count = len(total_registered_users)
        total_registration_rate = round((total_registered_users_count / total_issued_count) * 100, 1) if total_issued_count > 0 else 0.0
        total_payment_rate = round((total_payment_completed / total_issued_count) * 100, 1) if total_issued_count > 0 else 0.0
        
        # 지점별 쿠폰명 리스트로 변환
        store_coupon_list = {}
        for store, coupon_names in store_coupon_stats.items():
            store_coupon_list[store] = sorted(list(coupon_names))
        
        # 쿠폰명별 통계를 최종 형태로 변환 (등록률, 결제율 추가)
        coupon_statistics = []
        for coupon_name, stats in coupon_name_stats.items():
            issued_count = stats['issued_count']
            registered_users_count = len(stats['registered_users'])
            payment_completed_count = stats['payment_completed_count']
            
            registration_rate = round((registered_users_count / issued_count) * 100, 1) if issued_count > 0 else 0.0
            payment_rate = round((payment_completed_count / issued_count) * 100, 1) if issued_count > 0 else 0.0
            
            # 디버깅용 로그 추가
            logger.info(f"쿠폰 '{coupon_name}': 등록률={registration_rate}%, 결제율={payment_rate}%")
            
            coupon_statistics.append({
                "name": coupon_name,
                "issued_count": issued_count,
                "registered_users_count": registered_users_count,
                "payment_completed_count": payment_completed_count,
                "registration_rate": registration_rate,
                "payment_rate": payment_rate
            })
        
        # 쿠폰명으로 정렬
        coupon_statistics.sort(key=lambda x: x['name'])
        
        return {
            "team_id": team_id,
            "summary": {
                "total_issued_count": total_issued_count,
                "total_registered_users_count": total_registered_users_count,
                "total_payment_completed_count": total_payment_completed,
                "total_registration_rate": total_registration_rate,
                "total_payment_rate": total_payment_rate,
                # 기존 필드들도 유지 (호환성을 위해)
                "total_coupons": len(coupons),
                "used_coupons": len([c for c in coupons if c['status'] == '사용완료']),
                "available_coupons": len([c for c in coupons if c['status'] == '사용가능']),
                "expired_coupons": len([c for c in coupons if c['status'] == '만료'])
            },
            "store_statistics": [
                {
                    "name": store,
                    "total": stats['total'],
                    "used": stats['used'],
                    "available": stats['available'],
                    "expired": stats['expired']
                }
                for store, stats in store_stats.items()
            ],
            "store_coupon_names": store_coupon_list,
            "coupon_statistics": coupon_statistics
        }
        
    except Exception as e:
        logger.error(f"팀 통계 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="통계 조회에 실패했습니다.")

# 쿠폰발행자 인증 관련 유틸리티 함수
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        issuer_email: str = payload.get("sub")
        if issuer_email is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
        return issuer_email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

def hash_contact_info(email: str = None, phone: str = None) -> str:
    """이메일 또는 전화번호를 해시화하여 고유 식별자 생성"""
    if email:
        return hashlib.sha256(email.lower().encode()).hexdigest()[:16]
    elif phone:
        # 전화번호에서 하이픈, 공백 제거
        clean_phone = ''.join(filter(str.isdigit, phone))
        return hashlib.sha256(clean_phone.encode()).hexdigest()[:16]
    return ""

# 쿠폰 발행자 관리 API 엔드포인트

@app.get("/api/issuers")
async def get_all_issuers():
    """모든 발행자 목록을 조회합니다."""
    try:
        issuers = issuer_db_service.get_all_issuers()
        return {"issuers": issuers}
    except Exception as e:
        logger.error(f"발행자 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="발행자 목록 조회에 실패했습니다.")

@app.post("/api/issuers")
async def create_issuer(issuer: IssuerAuthRequest):
    """새 발행자를 생성합니다."""
    try:
        # 필수 필드 검증 - 전화번호 제거
        if not issuer.name or not issuer.email:
            raise HTTPException(status_code=400, detail="이름과 이메일은 필수 입력 사항입니다.")
        
        # 발행자 생성 - 전화번호는 선택사항
        success = issuer_db_service.save_issuer_info(
            name=issuer.name,
            email=issuer.email,
            phone=issuer.phone  # 선택사항이므로 None일 수 있음
        )
        
        if success:
            return {"message": f"발행자 '{issuer.name}'가 성공적으로 생성되었습니다."}
        else:
            raise HTTPException(status_code=500, detail="발행자 생성에 실패했습니다.")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"발행자 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="발행자 생성에 실패했습니다.")

@app.put("/api/issuers/{issuer_email}")
async def update_issuer(issuer_email: str, update_data: dict):
    """발행자 정보를 수정합니다."""
    try:
        name = update_data.get('name')
        phone = update_data.get('phone')
        new_email = update_data.get('email')
        
        if not name and not phone and not new_email:
            raise HTTPException(status_code=400, detail="수정할 정보가 없습니다.")
        
        # 발행자 존재 확인
        issuers = issuer_db_service.get_all_issuers()
        existing_issuer = next((i for i in issuers if i['email'] == issuer_email), None)
        
        if not existing_issuer:
            raise HTTPException(status_code=404, detail="발행자를 찾을 수 없습니다.")
        
        # 이메일 변경이 있는 경우
        if new_email and new_email != issuer_email:
            # 새 이메일이 이미 사용 중인지 확인
            existing_new_email = next((i for i in issuers if i['email'] == new_email), None)
            if existing_new_email:
                raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")
            
            # 기존 발행자의 쿠폰 할당 정보 조회
            assigned_coupon_ids = issuer_db_service.get_assigned_coupon_ids(issuer_email)
            
            # 새 이메일로 발행자 정보 저장
            success = issuer_db_service.save_issuer_info(
                name=name or existing_issuer['name'],
                email=new_email,
                phone=phone or existing_issuer.get('phone')
            )
            
            if success:
                # 쿠폰 할당 정보를 새 이메일로 이전
                for coupon_id in assigned_coupon_ids:
                    issuer_db_service.assign_coupon_to_issuer(
                        name=name or existing_issuer['name'],
                        coupon_id=coupon_id,
                        email=new_email,
                        phone=phone or existing_issuer.get('phone')
                    )
                
                # 기존 발행자 삭제
                issuer_db_service.delete_issuer(issuer_email)
                
                return {"message": f"발행자 정보가 성공적으로 수정되었습니다. 새 이메일: {new_email}"}
            else:
                raise HTTPException(status_code=500, detail="발행자 정보 수정에 실패했습니다.")
        else:
            # 이메일 변경이 없는 경우 - 기존 로직 유지
            success = issuer_db_service.save_issuer_info(
                name=name or existing_issuer['name'],
                email=issuer_email,
                phone=phone or existing_issuer.get('phone')
            )
            
            if success:
                return {"message": f"발행자 '{issuer_email}' 정보가 성공적으로 수정되었습니다."}
            else:
                raise HTTPException(status_code=500, detail="발행자 정보 수정에 실패했습니다.")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"발행자 정보 수정 실패: {e}")
        raise HTTPException(status_code=500, detail="발행자 정보 수정에 실패했습니다.")

@app.delete("/api/issuers/{issuer_email}")
async def delete_issuer(issuer_email: str):
    """발행자를 삭제합니다."""
    try:
        # 발행자 존재 확인
        issuers = issuer_db_service.get_all_issuers()
        existing_issuer = next((i for i in issuers if i['email'] == issuer_email), None)
        
        if not existing_issuer:
            raise HTTPException(status_code=404, detail="발행자를 찾을 수 없습니다.")
        
        # 발행자 삭제
        success = issuer_db_service.delete_issuer(issuer_email)
        
        if success:
            return {"message": f"발행자 '{issuer_email}'가 성공적으로 삭제되었습니다."}
        else:
            raise HTTPException(status_code=500, detail="발행자 삭제에 실패했습니다.")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"발행자 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="발행자 삭제에 실패했습니다.")

@app.post("/api/issuers/{issuer_email}/assign-coupon")
async def assign_coupon_to_issuer(issuer_email: str, request: dict):
    """쿠폰을 발행자에게 할당"""
    try:
        coupon_id = request.get('coupon_id')
        issuer_name = request.get('name')
        issuer_phone = request.get('phone')
        
        if not coupon_id:
            raise HTTPException(status_code=400, detail="쿠폰 ID가 필요합니다.")
        
        if not issuer_name:
            raise HTTPException(status_code=400, detail="발행자 이름이 필요합니다.")
        
        # 별도 DB에서 쿠폰 할당
        success = issuer_db_service.assign_coupon_to_issuer(
            name=issuer_name,
            coupon_id=coupon_id,
            email=issuer_email,
            phone=issuer_phone
        )
        
        if success:
            return {"message": f"쿠폰 {coupon_id}가 발행자 '{issuer_email}'에게 할당되었습니다."}
        else:
            raise HTTPException(status_code=500, detail="쿠폰 할당에 실패했습니다.")
            
    except Exception as e:
        logger.error(f"쿠폰 할당 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰 할당에 실패했습니다.")

@app.get("/api/issuers/{issuer_email}/assigned-coupons")
async def get_assigned_coupons(issuer_email: str):
    """특정 발행자에게 할당된 쿠폰 ID 목록을 조회합니다."""
    try:
        coupon_ids = issuer_db_service.get_assigned_coupon_ids(issuer_email)
        
        # 발행자 이름도 함께 반환
        issuers = issuer_db_service.get_all_issuers()
        issuer = next((i for i in issuers if i['email'] == issuer_email), None)
        issuer_name = issuer['name'] if issuer else issuer_email
        
        return {
            "issuer_email": issuer_email,
            "issuer_name": issuer_name,
            "assigned_coupon_ids": coupon_ids
        }
    except Exception as e:
        logger.error(f"할당된 쿠폰 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="할당된 쿠폰 조회에 실패했습니다.")

@app.get("/api/debug/database", summary="데이터베이스 디버깅")
async def debug_database():
    """데이터베이스의 사용자와 쿠폰 정보를 확인합니다."""
    try:
        debug_info = db_service.debug_check_users_and_coupons()
        return debug_info
    except Exception as e:
        logger.error(f"디버깅 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="디버깅 조회에 실패했습니다.")

@app.post("/api/issuer/login")
async def issuer_login(request: IssuerAuthRequest):
    """발행자 로그인"""
    try:
        # 이메일과 이름 검증
        if not request.email or not request.name:
            raise HTTPException(status_code=400, detail="이메일과 이름은 필수 입력 사항입니다.")
        
        # SQLite에서 발행자 정보 조회
        issuers = issuer_db_service.get_all_issuers()
        issuer = None
        
        for i in issuers:
            if i['email'] == request.email and i['name'] == request.name:
                issuer = i
                break
        
        if not issuer:
            raise HTTPException(status_code=401, detail="등록되지 않은 발행자이거나 정보가 일치하지 않습니다.")
        
        # JWT 토큰 생성
        token_data = {
            "sub": issuer['email'],
            "name": issuer['name'],
            "iat": datetime.utcnow().timestamp()
        }
        
        access_token = create_access_token(data=token_data)
        
        return IssuerAuthResponse(
            access_token=access_token,
            token_type="bearer",
            issuer_name=issuer['name'],
            expires_in=JWT_EXPIRATION_HOURS * 3600  # 초 단위
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"발행자 로그인 실패: {e}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")

@app.get("/api/issuer/profile")
async def get_issuer_profile(issuer_email: str = Depends(verify_token)):
    """발행자 프로필 조회"""
    try:
        # SQLite에서 발행자 정보 조회
        issuers = issuer_db_service.get_all_issuers()
        issuer = next((i for i in issuers if i['email'] == issuer_email), None)
        
        if not issuer:
            raise HTTPException(status_code=404, detail="발행자를 찾을 수 없습니다.")
        
        # 할당된 쿠폰 정보 조회
        assigned_coupon_ids = issuer_db_service.get_assigned_coupon_ids(issuer_email)
        
        # PostgreSQL에서 쿠폰 상세 정보 조회
        active_coupons = 0
        expired_coupons = 0
        
        if assigned_coupon_ids:
            coupons = db_service.get_coupons_by_issuer(issuer_email)
            for coupon in coupons:
                # 실제 쿠폰 상태를 확인하여 카운트
                status = coupon.get('status', '')
                if status == '사용가능':
                    active_coupons += 1
                elif status == '만료':
                    expired_coupons += 1
        
        return IssuerProfile(
            name=issuer['name'],
            email=issuer['email'],
            phone=issuer.get('phone'),
            total_coupons=len(assigned_coupon_ids),
            active_coupons=active_coupons,
            expired_coupons=expired_coupons
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"발행자 프로필 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="프로필 조회 중 오류가 발생했습니다.")

@app.get("/api/issuer/coupons")
async def get_issuer_coupons(
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    issuer_email: str = Depends(verify_token)
):
    """발행자 쿠폰 목록 조회"""
    try:
        # SQLite에서 발행자 정보 조회
        issuers = issuer_db_service.get_all_issuers()
        issuer = next((i for i in issuers if i['email'] == issuer_email), None)
        
        if not issuer:
            raise HTTPException(status_code=404, detail="발행자를 찾을 수 없습니다.")
        
        # 할당된 쿠폰 정보 조회
        all_coupons = db_service.get_coupons_by_issuer(issuer_email)
        
        # 페이지네이션
        total = len(all_coupons)
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        coupons = all_coupons[start_idx:end_idx]
        
        # 쿠폰 객체로 변환
        coupon_objects = []
        for coupon in coupons:
            coupon_obj = Coupon(
                id=coupon.get('id'),
                name=coupon.get('name', ''),
                discount=coupon.get('discount', ''),
                expiration_date=coupon.get('expiration_date', ''),
                store=coupon.get('store', ''),
                status=coupon.get('status', ''),
                code=coupon.get('code', ''),
                standard_price=coupon.get('standard_price', 0),
                registered_by='미등록',  # 임시로 하드코딩하여 문제 해결
                additional_info=coupon.get('memo', ''),
                payment_status=coupon.get('payment_status', '미결제')
            )
            coupon_objects.append(coupon_obj)
        
        return PaginatedCoupons(
            coupons=coupon_objects,
            total=total,
            page=page,
            size=size,
            total_pages=(total + size - 1) // size
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"발행자 쿠폰 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰 목록 조회 중 오류가 발생했습니다.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 