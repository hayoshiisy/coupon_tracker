import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any
import logging
from config import DatabaseConfig
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.connection_params = {
            'host': DatabaseConfig.HOST,
            'port': DatabaseConfig.PORT,
            'database': DatabaseConfig.NAME,
            'user': DatabaseConfig.USER,
            'password': DatabaseConfig.PASSWORD
        }
    
    def get_connection(self):
        """데이터베이스 연결을 반환합니다."""
        try:
            conn = psycopg2.connect(**self.connection_params)
            return conn
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패: {e}")
            raise
    
    def get_coupons_from_db(self) -> List[Dict[str, Any]]:
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            query = """
            SELECT 
                a.id,
                CASE 
                    WHEN a.date_expired > CURRENT_DATE THEN '사용가능'
                    WHEN a.date_expired <= CURRENT_DATE THEN '만료' 
                    WHEN a.date_expired IS NULL THEN '사용가능' 
                END as status,
                a.code_value as code,
                a.title,
                a.dc_amount as discount_amount,
                a.dc_rate as discount_rate,
                a.date_expired as expiry_date,
                b.name as store_name,
                c.name as provider_name,
                a.standard_price,
                e.id as user_id,
                e.name as registered_user_name,
                CASE 
                    WHEN d.is_used = TRUE THEN '결제완료' 
                    ELSE '미결제' 
                END as payment_status,
                CASE 
                    WHEN d.is_used = TRUE THEN true 
                    ELSE false 
                END as used
            FROM b_payment_bcoupon a
            LEFT JOIN b_class_bplace b ON b.id = a.b_place_id
            LEFT JOIN b_class_bprovider c ON a.b_provider_id = c.id
            LEFT JOIN b_payment_bcouponuser d ON d.b_coupon_id = a.id
            LEFT JOIN user_user e ON d.user_id = e.id
            WHERE a.title LIKE '%팀버핏%'
            ORDER BY a.id DESC
            """
            
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            results = cursor.fetchall()
            
            coupons = []
            for row in results:
                coupon_dict = dict(zip(columns, row))
                
                # 날짜 포맷팅
                if coupon_dict.get('expiry_date'):
                    coupon_dict['expiry_date'] = coupon_dict['expiry_date'].strftime('%Y-%m-%d')
                else:
                    coupon_dict['expiry_date'] = '-'
                
                # API 응답 형식에 맞게 변환
                api_coupon = {
                    'id': coupon_dict.get('id'),
                    'name': coupon_dict.get('title') or '쿠폰명 없음',
                    'discount': self._format_discount(coupon_dict.get('discount_amount'), coupon_dict.get('discount_rate')),
                    'expiration_date': coupon_dict['expiry_date'],
                    'store': coupon_dict.get('store_name') or coupon_dict.get('provider_name') or '알 수 없음',
                    'status': coupon_dict.get('status', '사용가능'),
                    'code': coupon_dict.get('code') or '',
                    'standard_price': coupon_dict.get('standard_price', 0),
                    'registered_by': coupon_dict.get('registered_user_name') or '미등록',
                    'payment_status': coupon_dict.get('payment_status', '미결제'),
                    'additional_info': ''
                }
                
                coupons.append(api_coupon)
            
            logging.info(f"총 {len(coupons)}개의 쿠폰을 조회했습니다.")
            return coupons
            
        except Exception as e:
            logging.error(f"쿠폰 조회 실패: {e}")
            return self._get_default_coupons()
        finally:
            if 'connection' in locals():
                connection.close()
    
    def _determine_status(self, used_flag: bool, expiry_date) -> str:
        """만료일을 기반으로 상태를 결정합니다."""
        current_date = datetime.now().date()
        
        # 사용된 쿠폰인지 먼저 확인
        if used_flag:
            logger.info(f"사용된 쿠폰")
            return "사용완료"
        
        # 만료일이 NULL인 경우 사용가능으로 처리
        if expiry_date is None:
            logger.info(f"만료일이 NULL인 쿠폰 - 사용가능으로 처리")
            return "사용가능"
        
        # 만료일 확인 (현재 날짜와 비교)
        if expiry_date <= current_date:
            logger.info(f"만료된 쿠폰: {expiry_date} <= {current_date}")
            return "만료"
        
        logger.info(f"사용가능한 쿠폰: {expiry_date} > {current_date}")
        return "사용가능"
    
    def get_coupon_names_from_db(self) -> List[str]:
        """데이터베이스에서 고유한 쿠폰명 리스트를 조회합니다."""
        query = """
        SELECT DISTINCT a.title as 쿠폰명
        FROM b_payment_bcoupon a
        WHERE a.title LIKE '%팀버핏%' AND a.title IS NOT NULL
        ORDER BY a.title
        """
        
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query)
                    results = cursor.fetchall()
                    
                    # 쿠폰명만 추출하여 리스트로 반환
                    coupon_names = [row['쿠폰명'] for row in results if row['쿠폰명']]
                    return coupon_names
                    
        except Exception as e:
            logger.error(f"쿠폰명 리스트 조회 실패: {e}")
            # 데이터베이스 연결 실패 시 기본 쿠폰명 반환
            return ["팀버핏 20% 할인 쿠폰", "팀버핏 무료 체험 쿠폰"]

    def get_stores_from_db(self) -> List[str]:
        """데이터베이스에서 고유한 지점명 리스트를 조회합니다."""
        query = """
        SELECT DISTINCT 
            COALESCE(b.name, c.name) as 지점명
        FROM b_payment_bcoupon a
        LEFT JOIN b_class_bplace b ON b.id = a.b_place_id
        LEFT JOIN b_class_bprovider c ON a.b_provider_id = c.id
        WHERE a.title LIKE '%팀버핏%' 
        AND COALESCE(b.name, c.name) IS NOT NULL
        ORDER BY COALESCE(b.name, c.name)
        """
        
        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(query)
                    results = cursor.fetchall()
                    
                    # 지점명만 추출하여 리스트로 반환
                    store_names = [row['지점명'] for row in results if row['지점명']]
                    return store_names
                    
        except Exception as e:
            logger.error(f"지점명 리스트 조회 실패: {e}")
            # 데이터베이스 연결 실패 시 기본 지점명 반환
            return ["팀버핏"]

    def _get_category_from_store(self, store_name: str) -> str:
        """매장명을 기반으로 카테고리를 추론합니다."""
        if not store_name:
            return '기타'
            
        store_lower = store_name.lower()
        
        if any(keyword in store_lower for keyword in ['카페', 'cafe', '커피', 'coffee', '스타벅스', '이디야']):
            return '카페'
        elif any(keyword in store_lower for keyword in ['맥도날드', '버거킹', 'kfc', '롯데리아', '패스트푸드']):
            return '패스트푸드'
        elif any(keyword in store_lower for keyword in ['레스토랑', '식당', '음식점', '한식', '중식', '일식', '양식']):
            return '레스토랑'
        elif any(keyword in store_lower for keyword in ['마트', '쇼핑', '백화점', '편의점', '온라인']):
            return '쇼핑'
        elif any(keyword in store_lower for keyword in ['뷰티', '미용', '화장품', '네일', '헤어']):
            return '뷰티'
        elif any(keyword in store_lower for keyword in ['여행', '호텔', '펜션', '리조트', '항공']):
            return '여행'
        else:
            return '기타'
    
    def _get_default_coupons(self) -> List[Dict[str, Any]]:
        """데이터베이스 연결 실패 시 기본 쿠폰 데이터를 반환합니다."""
        return [
            {
                'id': 1,
                'name': '팀버핏 20% 할인 쿠폰',
                'discount': '20%',
                'expiration_date': '2024-12-31',
                'store': '팀버핏',
                'status': '사용가능',
                'code': 'TEAMBEFIT20',
                'standard_price': 0,
                'registered_by': '시스템',
                'payment_status': '미결제',
                'additional_info': ''
            },
            {
                'id': 2,
                'name': '팀버핏 무료 체험 쿠폰',
                'discount': '100%',
                'expiration_date': '2024-06-30',
                'store': '팀버핏',
                'status': '만료',
                'code': 'TEAMBEFIT_FREE',
                'standard_price': 50000,
                'registered_by': '시스템',
                'payment_status': '결제완료',
                'additional_info': ''
            }
        ]

    def _format_discount(self, discount_amount, discount_rate) -> str:
        """할인 정보를 포맷팅합니다."""
        if discount_amount and discount_amount > 0:
            return f"{discount_amount:,}원"
        elif discount_rate and discount_rate > 0:
            return f"{discount_rate}%"
        else:
            return "할인정보없음"

# 전역 데이터베이스 서비스 인스턴스
db_service = DatabaseService() 