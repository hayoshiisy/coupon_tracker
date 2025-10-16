import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IssuerDatabaseService:
    def __init__(self):
        # PostgreSQL 연결 정보 (없거나 연결 실패 시 비활성화 모드)
        self.database_url = os.getenv('DATABASE_URL')
        self.disabled = False
        # 간단한 인메모리 저장소 (비활성화 모드에서 사용)
        self._memory_mapping = {}  # coupon_id -> issuer_email
        self._memory_issuers = {}  # email -> {name, phone}

        if not self.database_url:
            self.disabled = True
            logger.warning("발행자 DB 비활성화: DATABASE_URL 미설정. 발행자 기능 없이 동작합니다.")
            return

        logger.info(f"PostgreSQL 데이터베이스 연결: {self.database_url[:50]}...")
        try:
            self.create_tables()
        except Exception as e:
            self.disabled = True
            logger.error(f"테이블 생성 실패: {e}. 발행자 기능 비활성화 모드로 전환합니다.")
    
    def get_connection(self):
        """PostgreSQL 데이터베이스 연결을 반환합니다."""
        try:
            if self.disabled:
                raise RuntimeError("발행자 DB 비활성화 모드")
            conn = psycopg2.connect(self.database_url)
            return conn
        except Exception as e:
            logger.error(f"PostgreSQL 연결 실패: {e}")
            raise
    
    def create_tables(self):
        """발행자 관련 테이블을 생성합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 발행자 정보 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_issuers (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 발행자-쿠폰 매핑 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_issuer_mapping (
                    id SERIAL PRIMARY KEY,
                    coupon_id INTEGER NOT NULL,
                    issuer_email TEXT NOT NULL,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(coupon_id, issuer_email),
                    FOREIGN KEY (issuer_email) REFERENCES coupon_issuers(email)
                )
            ''')
            
            # 인덱스 생성
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_issuer_email ON coupon_issuers(email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_mapping_issuer ON coupon_issuer_mapping(issuer_email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_mapping_coupon ON coupon_issuer_mapping(coupon_id)')
            
            conn.commit()
            conn.close()
            logger.info("발행자 PostgreSQL 테이블이 성공적으로 생성되었습니다.")
            
        except Exception as e:
            logger.error(f"테이블 생성 실패: {e}")
            raise
    
    def save_issuer_info(self, name: str, email: str, phone: str = None) -> bool:
        """발행자 정보를 저장하거나 업데이트합니다."""
        try:
            if self.disabled:
                # 인메모리에 저장
                self._memory_issuers[email] = {"name": name, "email": email, "phone": phone}
                return True
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 기존 발행자 확인
            cursor.execute("SELECT id, name FROM coupon_issuers WHERE email = %s", (email,))
            existing = cursor.fetchone()
            
            if existing:
                # 업데이트
                existing_name = existing[1]
                update_name = existing_name if existing_name else name
                cursor.execute("""
                    UPDATE coupon_issuers 
                    SET name = %s, 
                        phone = COALESCE(%s, phone), 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = %s
                """, (update_name, phone, email))
                logger.info(f"발행자 정보 업데이트: {email} (이름 유지: {update_name})")
            else:
                # 새로 삽입
                cursor.execute("""
                    INSERT INTO coupon_issuers (name, email, phone) 
                    VALUES (%s, %s, %s)
                """, (name, email, phone))
                logger.info(f"새 발행자 생성: {email}")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"발행자 정보 저장 실패: {e}")
            return False
    
    def assign_coupon_to_issuer(self, name: str, coupon_id: int, email: str, phone: str = None) -> bool:
        """쿠폰을 발행자에게 할당합니다."""
        try:
            if self.disabled:
                # 인메모리 매핑 기록
                self._memory_issuers[email] = {"name": name, "email": email, "phone": phone}
                self._memory_mapping[coupon_id] = email
                return True
            # 먼저 발행자 정보 저장/업데이트
            self.save_issuer_info(name, email, phone)
            
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 기존 할당 확인
            cursor.execute("SELECT issuer_email FROM coupon_issuer_mapping WHERE coupon_id = %s", (coupon_id,))
            existing = cursor.fetchone()
            
            if existing:
                # 기존 할당이 있으면 업데이트
                old_email = existing[0]
                cursor.execute("""
                    UPDATE coupon_issuer_mapping 
                    SET issuer_email = %s, assigned_at = CURRENT_TIMESTAMP 
                    WHERE coupon_id = %s
                """, (email, coupon_id))
                logger.info(f"쿠폰 {coupon_id}의 발행자를 {old_email}에서 {email}로 업데이트했습니다.")
            else:
                # 새로운 할당
                cursor.execute("""
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email) 
                    VALUES (%s, %s)
                """, (coupon_id, email))
                logger.info(f"쿠폰 {coupon_id}를 발행자 {email}에게 할당했습니다.")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"쿠폰 할당 실패: {e}")
            return False
    
    def get_all_issuers(self) -> List[Dict]:
        """모든 발행자와 할당된 쿠폰 수를 조회합니다."""
        try:
            if self.disabled:
                # 인메모리 목록 반환
                issuers = []
                for email, info in self._memory_issuers.items():
                    count = sum(1 for cid, em in self._memory_mapping.items() if em == email)
                    issuers.append({
                        'name': info.get('name') or email,
                        'email': email,
                        'phone': info.get('phone'),
                        'created_at': None,
                        'coupon_count': count
                    })
                return issuers
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
            SELECT 
                ci.name,
                ci.email,
                ci.phone,
                ci.created_at,
                COUNT(cim.coupon_id) as coupon_count
            FROM coupon_issuers ci
            LEFT JOIN coupon_issuer_mapping cim ON ci.email = cim.issuer_email
            GROUP BY ci.name, ci.email, ci.phone, ci.created_at
            ORDER BY ci.created_at DESC
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"발행자 목록 조회 실패: {e}")
            return []
    
    def get_assigned_coupon_ids(self, issuer_email: str) -> List[int]:
        """특정 발행자에게 할당된 쿠폰 ID 목록을 조회합니다."""
        try:
            if self.disabled:
                return [cid for cid, em in self._memory_mapping.items() if em == issuer_email]
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT coupon_id FROM coupon_issuer_mapping 
                WHERE issuer_email = %s
                ORDER BY assigned_at DESC
            """, (issuer_email,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [row[0] for row in results]
            
        except Exception as e:
            logger.error(f"할당된 쿠폰 조회 실패: {e}")
            return []
    
    def delete_issuer(self, issuer_email: str) -> bool:
        """발행자를 삭제합니다. (관련 쿠폰 할당도 함께 삭제)"""
        try:
            if self.disabled:
                # 인메모리에서 제거
                if issuer_email in self._memory_issuers:
                    del self._memory_issuers[issuer_email]
                self._memory_mapping = {cid: em for cid, em in self._memory_mapping.items() if em != issuer_email}
                return True
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 쿠폰 할당 먼저 삭제
            cursor.execute("DELETE FROM coupon_issuer_mapping WHERE issuer_email = %s", (issuer_email,))
            
            # 발행자 삭제
            cursor.execute("DELETE FROM coupon_issuers WHERE email = %s", (issuer_email,))
            
            conn.commit()
            conn.close()
            logger.info(f"발행자 {issuer_email} 삭제 완료")
            return True
            
        except Exception as e:
            logger.error(f"발행자 삭제 실패: {e}")
            return False
    
    def test_connection(self) -> Dict:
        """데이터베이스 연결 및 테이블 존재 여부를 테스트합니다."""
        try:
            if self.disabled:
                return {
                    'status': 'disabled',
                    'database_type': 'PostgreSQL',
                    'reason': 'DATABASE_URL not set or connection failed'
                }
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 테이블 존재 확인
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('coupon_issuers', 'coupon_issuer_mapping')
            """)
            tables = [row[0] for row in cursor.fetchall()]
            
            # 레코드 수 확인
            cursor.execute("SELECT COUNT(*) FROM coupon_issuers")
            issuer_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM coupon_issuer_mapping")
            mapping_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'status': 'success',
                'database_type': 'PostgreSQL',
                'database_url': self.database_url[:50] + "...",
                'tables': tables,
                'issuer_count': issuer_count,
                'mapping_count': mapping_count
            }
            
        except Exception as e:
            logger.error(f"데이터베이스 테스트 실패: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }

    # 확장: 여러 이메일의 할당 쿠폰 ID 집합 반환
    def get_assigned_coupon_ids_for_emails(self, emails: List[str]) -> List[int]:
        ids: List[int] = []
        for email in emails:
            ids.extend(self.get_assigned_coupon_ids(email))
        # 중복 제거
        return list(dict.fromkeys(ids))

    # 확장: 특정 쿠폰 ID 목록에 대한 email 매핑 반환
    def get_coupon_id_to_issuer_map(self, coupon_ids: List[int]) -> Dict[int, str]:
        if self.disabled:
            return {cid: self._memory_mapping.get(cid) for cid in coupon_ids if cid in self._memory_mapping}
        try:
            if not coupon_ids:
                return {}
            conn = self.get_connection()
            cursor = conn.cursor()
            placeholders = ','.join(['%s'] * len(coupon_ids))
            cursor.execute(f"SELECT coupon_id, issuer_email FROM coupon_issuer_mapping WHERE coupon_id IN ({placeholders})", tuple(coupon_ids))
            results = cursor.fetchall()
            conn.close()
            return {row[0]: row[1] for row in results}
        except Exception as e:
            logger.error(f"쿠폰 발행자 매핑 조회 실패: {e}")
            return {}

    # 확장: 모든 할당된 쿠폰 ID 집합 반환
    def get_all_assigned_coupon_ids(self) -> List[int]:
        if self.disabled:
            return list(self._memory_mapping.keys())
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT coupon_id FROM coupon_issuer_mapping")
            ids = [row[0] for row in cursor.fetchall()]
            conn.close()
            return ids
        except Exception as e:
            logger.error(f"모든 할당 쿠폰 조회 실패: {e}")
            return []

# 전역 서비스 인스턴스
issuer_db_service = IssuerDatabaseService() 