import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
import logging
from typing import List, Dict, Any
import os
from config import DatabaseConfig
from datetime import datetime
from issuer_database import issuer_db_service

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
    
    def get_coupons_from_db(self, team_id: str = None, page: int = 1, size: int = 100, 
                           search: str = None, coupon_names: List[str] = None, 
                           store_names: List[str] = None, issuer: str = None) -> Dict[str, Any]:
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # 발행자 필터링이 있는 경우, 먼저 해당 발행자의 쿠폰 ID들을 조회
            issuer_coupon_ids = None
            if issuer:
                try:
                    logging.info(f"=== 발행자 필터링 시작: {issuer} ===")
                    # 이미 import된 issuer_db_service 사용
                    conn_sqlite = issuer_db_service.get_connection()
                    cursor_sqlite = conn_sqlite.cursor()
                    
                    # 쉼표로 구분된 여러 발행자 이메일 처리
                    issuer_emails = [email.strip() for email in issuer.split(',')]
                    placeholders = ','.join(['?' for _ in issuer_emails])
                    
                    # 발행자 이메일로 할당된 쿠폰 ID들 조회
                    sqlite_query = f"""
                        SELECT coupon_id FROM coupon_issuer_mapping 
                        WHERE issuer_email IN ({placeholders})
                    """
                    logging.info(f"SQLite 쿼리: {sqlite_query}")
                    logging.info(f"SQLite 파라미터: {issuer_emails}")
                    
                    cursor_sqlite.execute(sqlite_query, issuer_emails)
                    issuer_coupon_ids = [row[0] for row in cursor_sqlite.fetchall()]
                    conn_sqlite.close()
                    
                    logging.info(f"발행자 '{issuer}'에게 할당된 쿠폰 ID: {issuer_coupon_ids}")
                    
                    # 할당된 쿠폰이 없으면 빈 결과 반환
                    if not issuer_coupon_ids:
                        logging.info(f"발행자 '{issuer}'에게 할당된 쿠폰이 없습니다.")
                        return {
                            'coupons': [],
                            'total': 0,
                            'page': page,
                            'size': size,
                            'total_pages': 0
                        }
                except Exception as e:
                    logging.error(f"발행자 쿠폰 ID 조회 실패: {e}")
                    return {
                        'coupons': [],
                        'total': 0,
                        'page': page,
                        'size': size,
                        'total_pages': 0
                    }
            
            # 팀별 필터링 조건
            team_filter = ""
            base_params = []
            
            if team_id == "timberland":
                team_filter = "WHERE a.title LIKE %s"
                base_params = ['%팀버핏%']
            elif team_id == "teamb":
                team_filter = "WHERE (a.title LIKE %s OR a.title LIKE %s)"
                base_params = ['%패밀리 쿠폰)%', '%프렌즈 쿠폰)%']
            # team_id가 None이면 모든 쿠폰 조회 (WHERE 조건 없음)
            
            # 추가 필터링 조건들
            additional_filters = []
            params = base_params.copy()  # 기본 파라미터 복사
            
            # 발행자 필터링 (쿠폰 ID 기반)
            if issuer and issuer_coupon_ids:
                placeholders = ','.join(['%s'] * len(issuer_coupon_ids))
                additional_filters.append(f"a.id IN ({placeholders})")
                params.extend(issuer_coupon_ids)
            
            # 검색어 필터링
            if search:
                search_condition = """
                (LOWER(a.title) LIKE %s OR 
                 LOWER(COALESCE(b.name, c.name, '')) LIKE %s OR 
                 LOWER(COALESCE(a.code_value, '')) LIKE %s)
                """
                additional_filters.append(search_condition)
                search_param = f"%{search.lower()}%"
                params.extend([search_param, search_param, search_param])
            
            # 쿠폰명 필터링
            if coupon_names:
                placeholders = ','.join(['%s'] * len(coupon_names))
                additional_filters.append(f"a.title IN ({placeholders})")
                params.extend(coupon_names)
            
            # 지점명 필터링
            if store_names:
                placeholders = ','.join(['%s'] * len(store_names))
                additional_filters.append(f"COALESCE(b.name, c.name) IN ({placeholders})")
                params.extend(store_names)
            
            # WHERE 절 구성
            where_clause = team_filter
            if additional_filters:
                if team_filter:
                    where_clause += " AND " + " AND ".join(additional_filters)
                else:
                    where_clause = "WHERE " + " AND ".join(additional_filters)
            
            # 전체 개수 조회 쿼리
            count_query = f"""
            SELECT COUNT(*) as total
            FROM b_payment_bcoupon a
            LEFT JOIN b_class_bplace b ON b.id = a.b_place_id
            LEFT JOIN b_class_bprovider c ON a.b_provider_id = c.id
            LEFT JOIN b_payment_bcouponuser d ON d.b_coupon_id = a.id
            LEFT JOIN user_user e ON d.user_id = e.id
            {where_clause}
            """
            
            # 안전한 쿼리 실행
            logging.info(f"실행할 count 쿼리: {count_query}")
            logging.info(f"쿼리 파라미터: {params}")
            
            if params:
                cursor.execute(count_query, params)
            else:
                cursor.execute(count_query)
            count_result = cursor.fetchone()
            
            logging.info(f"count_result: {count_result}, 타입: {type(count_result)}")
            
            if count_result:
                if isinstance(count_result, (list, tuple)) and len(count_result) > 0:
                    total_count = count_result[0]
                else:
                    total_count = count_result if isinstance(count_result, int) else 0
            else:
                total_count = 0
            
            logging.info(f"total_count: {total_count}")
            
            # 발행자 필터링이 있는 경우 페이지네이션 무시하고 전체 데이터 반환
            if issuer:
                # 메인 데이터 조회 쿼리 (LIMIT, OFFSET 없음)
                query = f"""
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
                {where_clause}
                ORDER BY a.id DESC
                """
                
                # 전체 결과를 가져온 후 클라이언트에서 페이지네이션 처리
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                columns = [desc[0] for desc in cursor.description]
                all_results = cursor.fetchall()
                
                # 페이지네이션 처리
                offset = (page - 1) * size
                results = all_results[offset:offset + size]
                
                logging.info(f"발행자 '{issuer}' 필터링: 전체 {len(all_results)}개 중 {len(results)}개 반환 (페이지 {page})")
                
            else:
                # 일반적인 경우 페이지네이션 적용
                offset = (page - 1) * size
                
                # 메인 데이터 조회 쿼리 (LIMIT과 OFFSET은 문자열 포맷팅으로 처리)
                query = f"""
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
                {where_clause}
                ORDER BY a.id DESC
                LIMIT {size} OFFSET {offset}
                """
                
                # 메인 쿼리 실행
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                columns = [desc[0] for desc in cursor.description]
                results = cursor.fetchall()
            
            # SQLite에서 발행자 정보 조회 (한 번에 가져오기)
            issuer_mapping = {}
            if results:
                # 이미 import된 issuer_db_service 사용
                
                # 조회된 쿠폰 ID들 수집
                coupon_ids = [dict(zip(columns, row)).get('id') for row in results]
                
                # SQLite에서 해당 쿠폰들의 발행자 정보 조회
                try:
                    conn_sqlite = issuer_db_service.get_connection()
                    cursor_sqlite = conn_sqlite.cursor()
                    
                    if coupon_ids:
                        coupon_ids_str = ','.join(map(str, coupon_ids))
                        sqlite_query = f"""
                        SELECT cim.coupon_id, cim.issuer_email 
                        FROM coupon_issuer_mapping cim
                        WHERE cim.coupon_id IN ({coupon_ids_str})
                        """
                        cursor_sqlite.execute(sqlite_query)
                        sqlite_results = cursor_sqlite.fetchall()
                        
                        # 쿠폰 ID별 발행자 이메일 매핑 생성
                        for coupon_id, issuer_email in sqlite_results:
                            issuer_mapping[coupon_id] = issuer_email
                    
                    conn_sqlite.close()
                except Exception as e:
                    logging.warning(f"SQLite 발행자 정보 조회 실패: {e}")
            
            coupons = []
            for row in results:
                coupon_dict = dict(zip(columns, row))
                
                # 날짜 포맷팅
                if coupon_dict.get('expiry_date'):
                    coupon_dict['expiry_date'] = coupon_dict['expiry_date'].strftime('%Y-%m-%d')
                else:
                    coupon_dict['expiry_date'] = '-'
                
                # 발행자 정보와 등록자 정보 분리
                coupon_id = coupon_dict.get('id')
                issuer_email = issuer_mapping.get(coupon_id)  # SQLite에서 가져온 발행자 이메일
                registered_by = coupon_dict.get('registered_user_name') or '미등록'  # PostgreSQL의 실제 등록자
                
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
                    'registered_by': registered_by,  # PostgreSQL의 실제 등록자
                    'issuer': issuer_email or '',  # SQLite의 쿠폰발행자 이메일
                    'payment_status': coupon_dict.get('payment_status', '미결제'),
                    'additional_info': ''
                }
                
                coupons.append(api_coupon)
            
            total_pages = (total_count + size - 1) // size
            
            logging.info(f"팀 {team_id} - 페이지 {page}/{total_pages} 조회: {len(coupons)}개 쿠폰 (전체: {total_count}개)")
            
            return {
                'coupons': coupons,
                'total': total_count,
                'page': page,
                'size': size,
                'total_pages': total_pages
            }
            
        except Exception as e:
            logging.error(f"쿠폰 조회 실패: {e}")
            # 오류 발생 시 기본값 반환 대신 빈 결과 반환
            return {
                'coupons': [],
                'total': 0,
                'page': page,
                'size': size,
                'total_pages': 0
            }
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
    
    def get_coupon_names_from_db(self, team_id: str = None) -> List[str]:
        """데이터베이스에서 고유한 쿠폰명 리스트를 조회합니다."""
        # 팀별 필터링 조건
        team_filter = ""
        if team_id == "timberland":
            team_filter = "WHERE a.title LIKE '%팀버핏%'"
        elif team_id == "teamb":
            team_filter = "WHERE (a.title LIKE '%패밀리 쿠폰)%' OR a.title LIKE '%프렌즈 쿠폰)%')"
        # team_id가 None이면 모든 쿠폰 조회 (WHERE 조건 없음)
        
        query = f"""
        SELECT DISTINCT a.title as 쿠폰명
        FROM b_payment_bcoupon a
        {team_filter} {' AND ' if team_filter else 'WHERE '} a.title IS NOT NULL
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
            if team_id == "teamb":
                return ["피플팀 전용 쿠폰", "피플팀 할인 쿠폰"]
            else:
                return ["팀버핏 20% 할인 쿠폰", "팀버핏 무료 체험 쿠폰"]

    def get_stores_from_db(self, team_id: str = None) -> List[str]:
        """데이터베이스에서 고유한 지점명 리스트를 조회합니다."""
        # 팀별 필터링 조건
        team_filter = ""
        if team_id == "timberland":
            team_filter = "WHERE a.title LIKE '%팀버핏%'"
        elif team_id == "teamb":
            team_filter = "WHERE (a.title LIKE '%패밀리 쿠폰)%' OR a.title LIKE '%프렌즈 쿠폰)%')"
        # team_id가 None이면 모든 쿠폰 조회 (WHERE 조건 없음)
        
        query = f"""
        SELECT DISTINCT 
            COALESCE(b.name, c.name) as 지점명
        FROM b_payment_bcoupon a
        LEFT JOIN b_class_bplace b ON b.id = a.b_place_id
        LEFT JOIN b_class_bprovider c ON a.b_provider_id = c.id
        {team_filter}
        {' AND ' if team_filter else 'WHERE '} COALESCE(b.name, c.name) IS NOT NULL
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
            if team_id == "teamb":
                return ["피플팀 전용 매장"]
            else:
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
            return "-"

    def update_coupon_registered_by(self, coupon_id: int, registered_by: str) -> bool:
        """쿠폰의 등록자명을 업데이트합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 먼저 해당 쿠폰 ID에 대한 기존 레코드가 있는지 확인
            check_query = """
            SELECT id FROM b_payment_bcouponuser 
            WHERE coupon_id = %s
            """
            cursor.execute(check_query, (coupon_id,))
            existing_record = cursor.fetchone()
            
            if existing_record:
                # 기존 레코드가 있으면 사용자 ID를 찾아서 업데이트
                user_query = """
                SELECT id FROM b_payment_buser 
                WHERE username = %s OR real_name = %s
                """
                cursor.execute(user_query, (registered_by, registered_by))
                user_record = cursor.fetchone()
                
                if user_record:
                    user_id = user_record[0]
                    update_query = """
                    UPDATE b_payment_bcouponuser 
                    SET user_id = %s 
                    WHERE coupon_id = %s
                    """
                    cursor.execute(update_query, (user_id, coupon_id))
                    logging.info(f"쿠폰 ID {coupon_id}의 등록자를 사용자 ID {user_id}로 업데이트했습니다.")
                else:
                    logging.warning(f"사용자 '{registered_by}'를 찾을 수 없습니다.")
                    return False
            else:
                # 기존 레코드가 없으면 새로 생성
                user_query = """
                SELECT id FROM b_payment_buser 
                WHERE username = %s OR real_name = %s
                """
                cursor.execute(user_query, (registered_by, registered_by))
                user_record = cursor.fetchone()
                
                if user_record:
                    user_id = user_record[0]
                    insert_query = """
                    INSERT INTO b_payment_bcouponuser (coupon_id, user_id, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    """
                    cursor.execute(insert_query, (coupon_id, user_id))
                    logging.info(f"쿠폰 ID {coupon_id}에 대한 새 등록자 레코드를 생성했습니다.")
                else:
                    logging.warning(f"사용자 '{registered_by}'를 찾을 수 없습니다.")
                    return False
            
            conn.commit()
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            logging.error(f"쿠폰 등록자명 업데이트 실패: {e}")
            return False

    def get_coupons_by_issuer(self, issuer_email: str) -> List[dict]:
        """특정 쿠폰발행자의 쿠폰 목록 조회 (별도 DB 서비스 사용)"""
        try:
            logger.info(f"=== 발행자 '{issuer_email}' 쿠폰 조회 시작 ===")
            
            # 별도 DB에서 발행자에게 할당된 쿠폰 ID 조회
            coupon_ids = issuer_db_service.get_assigned_coupon_ids(issuer_email)
            logger.info(f"할당된 쿠폰 ID 목록: {coupon_ids}")
            
            if not coupon_ids:
                logger.info(f"발행자 '{issuer_email}'에게 할당된 쿠폰이 없습니다.")
                return []
            
            # 쿠폰 ID 1은 제외하고 teamb 쿠폰만 조회
            teamb_coupon_ids = [cid for cid in coupon_ids if cid != 1]
            
            if not teamb_coupon_ids:
                logger.info(f"발행자 '{issuer_email}'에게 할당된 teamb 쿠폰이 없습니다.")
                return []
            
            # 발행자 이름 조회 - 안전하게 처리
            issuer_name = issuer_email  # 기본값으로 email 사용
            try:
                issuers = issuer_db_service.get_all_issuers()
                issuer = next((i for i in issuers if i['email'] == issuer_email), None)
                if issuer:
                    issuer_name = issuer['name']
                    logger.info(f"발행자 이름 조회 성공: {issuer_name}")
                else:
                    logger.warning(f"발행자 이름을 찾을 수 없어 email을 사용합니다: {issuer_email}")
            except Exception as e:
                logger.warning(f"발행자 이름 조회 실패, email을 사용합니다: {e}")
            
            # teamb 팀 쿠폰 데이터에서 조회
            found_coupons = []
            
            # PostgreSQL에서 teamb 팀 쿠폰 조회
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # teamb 팀 필터링 조건 추가
            # 동적으로 쿠폰 ID를 쿼리에 포함
            coupon_ids_str = ','.join(map(str, teamb_coupon_ids))
            query = f"""
            SELECT 
                a.id,
                CASE 
                    WHEN a.date_expired > CURRENT_DATE THEN '사용가능'
                    WHEN a.date_expired <= CURRENT_DATE THEN '만료' 
                    WHEN a.date_expired IS NULL THEN '사용가능' 
                END as status,
                COALESCE(a.code_value, '') as code,
                COALESCE(a.title, '쿠폰명 없음') as title,
                COALESCE(a.dc_amount, 0) as discount_amount,
                COALESCE(a.dc_rate, 0) as discount_rate,
                a.date_expired as expiry_date,
                COALESCE(b.name, '알 수 없음') as store_name,
                COALESCE(c.name, '알 수 없음') as provider_name,
                COALESCE(a.standard_price, 0) as standard_price,
                COALESCE(e.name, '미등록') as registered_by,
                CASE 
                    WHEN d.is_used = TRUE THEN '결제완료' 
                    ELSE '미결제' 
                END as payment_status
            FROM b_payment_bcoupon a
            LEFT JOIN b_class_bplace b ON b.id = a.b_place_id
            LEFT JOIN b_class_bprovider c ON a.b_provider_id = c.id
            LEFT JOIN b_payment_bcouponuser d ON d.b_coupon_id = a.id
            LEFT JOIN user_user e ON d.user_id = e.id
            WHERE a.id IN ({coupon_ids_str})
            AND (
                (a.title LIKE '%패밀리 쿠폰)%' OR a.title LIKE '%프렌즈 쿠폰)%')
                OR (c.name LIKE '%teamb%' OR c.name LIKE '%TeamB%')
                OR (b.name LIKE '%teamb%' OR b.name LIKE '%TeamB%')
            )
            ORDER BY a.id DESC
            """
            
            logger.info(f"teamb 팀 쿠폰 조회 쿼리: {query}")
            logger.info(f"조회 teamb 쿠폰 ID 목록: {teamb_coupon_ids}")
            
            try:
                cursor.execute(query)  # 파라미터 없이 실행
                
                # 컬럼명을 안전하게 가져오기
                columns = []
                if cursor.description:
                    for desc in cursor.description:
                        if hasattr(desc, 'name'):
                            columns.append(desc.name)
                        else:
                            columns.append(desc[0])
                else:
                    logger.error("cursor.description이 None입니다")
                    connection.close()
                    return []
                
                logger.info(f"쿼리 결과 컬럼: {columns}")
                
                results = cursor.fetchall()
                logger.info(f"teamb 팀 쿠폰 조회 결과 수: {len(results)}")
                
                for i, row in enumerate(results):
                    try:
                        logger.info(f"처리 중인 행 {i}: 길이={len(row)}, 컬럼 수={len(columns)}")
                        logger.info(f"행 데이터: {row}")
                        
                        coupon_dict = dict(zip(columns, row))
                        logger.info(f"teamb 쿠폰 데이터: ID={coupon_dict.get('id')}, 제목={coupon_dict.get('title')}")
                        
                        # 날짜 포맷팅
                        if coupon_dict.get('expiry_date'):
                            expiry_date = coupon_dict['expiry_date'].strftime('%Y-%m-%d')
                        else:
                            expiry_date = None
                        
                        # 디버깅: registered_by 필드 확인
                        registered_by_from_db = coupon_dict.get('registered_by', '미등록')
                        logger.info(f"쿠폰 ID {coupon_dict.get('id')}: DB에서 가져온 registered_by = '{registered_by_from_db}'")
                        
                        coupon = {
                            'id': coupon_dict.get('id'),
                            'status': coupon_dict.get('status', '사용가능'),
                            'code': coupon_dict.get('code', ''),
                            'name': coupon_dict.get('title', '쿠폰명 없음'),
                            'discount_percent': coupon_dict.get('discount_rate', 0),
                            'discount_amount': coupon_dict.get('discount_amount', 0),
                            'expiration_date': expiry_date,
                            'store': coupon_dict.get('store_name', '알 수 없음'),
                            'provider': coupon_dict.get('provider_name', '알 수 없음'),
                            'registered_by': registered_by_from_db,  # PostgreSQL의 실제 등록자 (쿠폰등록회원)
                            'phone': None,
                            'usage_date': None,
                            'memo': '',
                            'created_at': None,
                            'updated_at': None,
                            'image_url': None,
                            'team_id': 'teamb',
                            'standard_price': coupon_dict.get('standard_price', 0),
                            'payment_status': coupon_dict.get('payment_status', '미결제'),  # 실제 결제 상태
                            'used': coupon_dict.get('payment_status') == '결제완료'  # 결제완료면 used=True
                        }
                        
                        # 디버깅: 최종 쿠폰 객체의 registered_by 확인
                        logger.info(f"쿠폰 ID {coupon['id']}: 최종 registered_by = '{coupon['registered_by']}'")
                        
                        # 할인 정보 설정
                        if coupon['discount_percent']:
                            coupon['discount'] = f"{coupon['discount_percent']}%"
                        elif coupon['discount_amount']:
                            coupon['discount'] = f"{coupon['discount_amount']:,}원"
                        else:
                            coupon['discount'] = "할인 정보 없음"
                        
                        found_coupons.append(coupon)
                        
                    except Exception as row_error:
                        logger.error(f"쿠폰 데이터 처리 중 오류 (행 {i}): {row_error}")
                        continue
                        
            except Exception as query_error:
                logger.error(f"PostgreSQL 쿼리 실행 오류: {query_error}")
                connection.close()
                return []
            
            connection.close()
            
            logger.info(f"=== 발행자 '{issuer_email}'의 teamb 쿠폰 {len(found_coupons)}개를 조회했습니다. ===")
            return found_coupons
            
        except Exception as e:
            logger.error(f"쿠폰발행자별 쿠폰 조회 실패: {e}")
            return []

    def get_assigned_coupon_ids(self, issuer_name: str) -> List[int]:
        """발행자에게 할당된 쿠폰 ID 목록을 조회합니다."""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # 쿠폰 발행자 매핑 테이블에서 조회
            query = """
            SELECT coupon_id FROM coupon_issuer_mapping 
            WHERE issuer_name = %s
            ORDER BY coupon_id
            """
            
            cursor.execute(query, (issuer_name,))
            results = cursor.fetchall()
            
            coupon_ids = [row[0] for row in results]
            logger.info(f"발행자 '{issuer_name}'에게 할당된 쿠폰 ID: {coupon_ids}")
            
            return coupon_ids
            
        except Exception as e:
            logger.error(f"발행자 쿠폰 ID 조회 실패: {e}")
            return []
        finally:
            if 'connection' in locals():
                connection.close()

    def assign_coupon_to_issuer(self, issuer_name: str, coupon_id: int, issuer_email: str = None, issuer_phone: str = None) -> bool:
        """쿠폰을 발행자에게 할당합니다."""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # 먼저 발행자 정보를 저장/업데이트
            self.save_issuer_info(issuer_name, issuer_email, issuer_phone)
            
            # 이미 할당된 쿠폰인지 확인
            check_query = """
            SELECT COUNT(*) FROM coupon_issuer_mapping 
            WHERE coupon_id = %s AND issuer_name = %s
            """
            cursor.execute(check_query, (coupon_id, issuer_name))
            exists = cursor.fetchone()[0] > 0
            
            if exists:
                logger.info(f"쿠폰 {coupon_id}는 이미 발행자 '{issuer_name}'에게 할당되어 있습니다.")
                return True
            
            # 쿠폰 할당
            insert_query = """
            INSERT INTO coupon_issuer_mapping (coupon_id, issuer_name, assigned_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            """
            cursor.execute(insert_query, (coupon_id, issuer_name))
            connection.commit()
            
            logger.info(f"쿠폰 {coupon_id}를 발행자 '{issuer_name}'에게 할당했습니다.")
            return True
            
        except Exception as e:
            logger.error(f"쿠폰 할당 실패: {e}")
            return False
        finally:
            if 'connection' in locals():
                connection.close()

    def unassign_coupon_from_issuer(self, issuer_name: str, coupon_id: int) -> bool:
        """발행자에게서 쿠폰 할당을 해제합니다."""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            delete_query = """
            DELETE FROM coupon_issuer_mapping 
            WHERE coupon_id = %s AND issuer_name = %s
            """
            cursor.execute(delete_query, (coupon_id, issuer_name))
            connection.commit()
            
            deleted_count = cursor.rowcount
            if deleted_count > 0:
                logger.info(f"쿠폰 {coupon_id}의 발행자 '{issuer_name}' 할당을 해제했습니다.")
                return True
            else:
                logger.warning(f"쿠폰 {coupon_id}는 발행자 '{issuer_name}'에게 할당되어 있지 않습니다.")
                return False
            
        except Exception as e:
            logger.error(f"쿠폰 할당 해제 실패: {e}")
            return False
        finally:
            if 'connection' in locals():
                connection.close()

    def save_issuer_info(self, issuer_name: str, issuer_email: str = None, issuer_phone: str = None) -> bool:
        """발행자 정보를 저장/업데이트합니다."""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # 먼저 기존 레코드가 있는지 확인
            check_query = "SELECT COUNT(*) FROM coupon_issuers WHERE name = %s"
            cursor.execute(check_query, (issuer_name,))
            exists = cursor.fetchone()[0] > 0
            
            if exists:
                # 업데이트
                update_query = """
                UPDATE coupon_issuers 
                SET email = %s, phone = %s, updated_at = CURRENT_TIMESTAMP
                WHERE name = %s
                """
                cursor.execute(update_query, (issuer_email, issuer_phone, issuer_name))
            else:
                # 삽입
                insert_query = """
                INSERT INTO coupon_issuers (name, email, phone, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
                cursor.execute(insert_query, (issuer_name, issuer_email, issuer_phone))
            
            connection.commit()
            logger.info(f"발행자 정보 저장/업데이트: {issuer_name}")
            return True
            
        except Exception as e:
            logger.error(f"발행자 정보 저장 실패: {e}")
            return False
        finally:
            if 'connection' in locals():
                connection.close()

    def get_all_issuers(self) -> List[dict]:
        """모든 발행자 목록을 조회합니다."""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            query = """
            SELECT 
                ci.name,
                ci.email,
                ci.phone,
                ci.created_at,
                ci.updated_at,
                COUNT(cim.coupon_id) as assigned_coupons
            FROM coupon_issuers ci
            LEFT JOIN coupon_issuer_mapping cim ON ci.name = cim.issuer_name
            GROUP BY ci.name, ci.email, ci.phone, ci.created_at, ci.updated_at
            ORDER BY ci.name
            """
            
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            results = cursor.fetchall()
            
            issuers = []
            for row in results:
                issuer_dict = dict(zip(columns, row))
                
                # 날짜 포맷팅
                if issuer_dict.get('created_at'):
                    issuer_dict['created_at'] = issuer_dict['created_at'].strftime('%Y-%m-%d %H:%M:%S')
                if issuer_dict.get('updated_at'):
                    issuer_dict['updated_at'] = issuer_dict['updated_at'].strftime('%Y-%m-%d %H:%M:%S')
                
                issuers.append(issuer_dict)
            
            logger.info(f"총 {len(issuers)}개의 발행자를 조회했습니다.")
            return issuers
            
        except Exception as e:
            logger.error(f"발행자 목록 조회 실패: {e}")
            return []
        finally:
            if 'connection' in locals():
                connection.close()

    def create_issuer_tables(self):
        """쿠폰 발행자 관리를 위한 테이블들을 생성합니다."""
        try:
            connection = self.get_connection()
            cursor = connection.cursor()
            
            # 발행자 정보 테이블
            create_issuers_table = """
            CREATE TABLE IF NOT EXISTS coupon_issuers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            # 쿠폰-발행자 매핑 테이블
            create_mapping_table = """
            CREATE TABLE IF NOT EXISTS coupon_issuer_mapping (
                id SERIAL PRIMARY KEY,
                coupon_id INTEGER NOT NULL,
                issuer_name VARCHAR(100) NOT NULL,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(coupon_id, issuer_name)
            );
            """
            
            cursor.execute(create_issuers_table)
            cursor.execute(create_mapping_table)
            connection.commit()
            
            logger.info("쿠폰 발행자 관리 테이블들이 생성되었습니다.")
            
        except Exception as e:
            logger.error(f"테이블 생성 실패: {e}")
            raise e
        finally:
            if 'connection' in locals():
                connection.close()

# 전역 데이터베이스 서비스 인스턴스
db_service = DatabaseService() 