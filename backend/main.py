from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from datetime import datetime
import logging
import os
from database import db_service

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="쿠폰 트래커 API", version="2.0.0")

# 환경 변수에서 CORS origins 가져오기
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
cors_origins = [origin.strip() for origin in cors_origins]

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
    standard_price: Optional[str] = None
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
        # 데이터베이스에서 모든 쿠폰 조회
        all_coupons = db_service.get_coupons_from_db()
        
        # 필터링 적용
        filtered_coupons = all_coupons
        
        # 검색어 필터링
        if search:
            search_lower = search.lower()
            filtered_coupons = [
                coupon for coupon in filtered_coupons 
                if (search_lower in coupon.get('name', '').lower() or 
                    search_lower in coupon.get('store', '').lower() or
                    search_lower in coupon.get('code', '').lower())
            ]
        
        # 쿠폰명 필터링
        if coupon_names:
            coupon_name_list = [name.strip() for name in coupon_names.split(',')]
            filtered_coupons = [
                coupon for coupon in filtered_coupons 
                if coupon.get('name', '') in coupon_name_list
            ]
        
        # 지점명 필터링
        if store_names:
            store_name_list = [name.strip() for name in store_names.split(',')]
            filtered_coupons = [
                coupon for coupon in filtered_coupons 
                if coupon.get('store', '') in store_name_list
            ]
        
        # 페이지네이션
        total_count = len(filtered_coupons)
        start_index = (page - 1) * size
        end_index = start_index + size
        paginated_coupons = filtered_coupons[start_index:end_index]
        total_pages = (total_count + size - 1) // size
        
        logger.info(f"페이지 {page}/{total_pages} 조회: {len(paginated_coupons)}개 쿠폰 (전체: {total_count}개)")
        
        return {
            "coupons": paginated_coupons,
            "total": total_count,
            "page": page,
            "size": size,
            "total_pages": total_pages
        }
        
    except Exception as e:
        logger.error(f"쿠폰 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰 조회에 실패했습니다")

@app.get("/api/coupons")
async def get_api_coupons(
    search: str = Query(None, description="검색어"),
    coupon_names: str = Query(None, description="쿠폰명 필터 (쉼표로 구분)"),
    store_names: str = Query(None, description="지점명 필터 (쉼표로 구분)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(100, ge=1, le=1000, description="페이지 크기")
):
    """쿠폰 목록을 조회합니다. (API 경로)"""
    try:
        # 데이터베이스에서 모든 쿠폰 조회
        all_coupons = db_service.get_coupons_from_db()
        
        # 필터링 적용
        filtered_coupons = all_coupons
        
        # 검색어 필터링
        if search:
            search_lower = search.lower()
            filtered_coupons = [
                coupon for coupon in filtered_coupons 
                if (search_lower in coupon.get('name', '').lower() or 
                    search_lower in coupon.get('store', '').lower() or
                    search_lower in coupon.get('code', '').lower())
            ]
        
        # 쿠폰명 필터링
        if coupon_names:
            coupon_name_list = [name.strip() for name in coupon_names.split(',')]
            filtered_coupons = [
                coupon for coupon in filtered_coupons 
                if coupon.get('name', '') in coupon_name_list
            ]
        
        # 지점명 필터링
        if store_names:
            store_name_list = [name.strip() for name in store_names.split(',')]
            filtered_coupons = [
                coupon for coupon in filtered_coupons 
                if coupon.get('store', '') in store_name_list
            ]
        
        # 페이지네이션
        total_count = len(filtered_coupons)
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_coupons = filtered_coupons[start_index:end_index]
        total_pages = (total_count + limit - 1) // limit
        
        logger.info(f"페이지 {page}/{total_pages} 조회: {len(paginated_coupons)}개 쿠폰 (전체: {total_count}개)")
        
        return {
            "coupons": paginated_coupons,
            "total": total_count,
            "page": page,
            "size": limit,
            "total_pages": total_pages
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
async def get_api_coupon_names():
    """쿠폰명 리스트를 반환합니다. (API 경로)"""
    try:
        coupon_names = db_service.get_coupon_names_from_db()
        return {"coupon_names": coupon_names}
    except Exception as e:
        logger.error(f"쿠폰명 리스트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="쿠폰명 리스트 조회에 실패했습니다.")

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
async def get_api_stores():
    """지점명 리스트를 반환합니다. (API 경로)"""
    try:
        store_names = db_service.get_stores_from_db()
        return {"stores": store_names}
    except Exception as e:
        logger.error(f"지점명 리스트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="지점명 리스트 조회에 실패했습니다.")

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

@app.get("/api/statistics")
async def get_statistics():
    """쿠폰 통계 정보를 반환합니다."""
    try:
        all_coupons = db_service.get_coupons_from_db()
        
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

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 