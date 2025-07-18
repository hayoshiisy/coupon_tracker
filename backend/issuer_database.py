import sqlite3
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IssuerDatabaseService:
    def __init__(self):
        # Railway Volume 경로 또는 로컬 경로 설정
        if os.getenv('RAILWAY_ENVIRONMENT'):
            # Railway 환경에서는 /app/data 디렉토리 사용
            data_dir = '/app/data'
            os.makedirs(data_dir, exist_ok=True)
            self.db_path = os.path.join(data_dir, 'issuer_database.db')
            logger.info(f"Railway 환경 감지 - Volume 경로 사용: {self.db_path}")
        else:
            # 로컬 환경에서는 기존 경로 사용
            self.db_path = os.path.join(os.path.dirname(__file__), 'issuer_database.db')
            logger.info(f"로컬 환경 - 기본 경로 사용: {self.db_path}")
        
        # 디렉토리 권한 및 존재 확인
        try:
            db_dir = os.path.dirname(self.db_path)
            if not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
                logger.info(f"데이터베이스 디렉토리 생성: {db_dir}")
            
            # 쓰기 권한 확인
            if os.access(db_dir, os.W_OK):
                logger.info(f"데이터베이스 디렉토리 쓰기 권한 확인: {db_dir}")
            else:
                logger.warning(f"데이터베이스 디렉토리 쓰기 권한 없음: {db_dir}")
                
        except Exception as e:
            logger.error(f"데이터베이스 디렉토리 확인 실패: {e}")
        
        logger.info(f"SQLite 데이터베이스 최종 경로: {self.db_path}")
        self.create_tables()
    
    def get_connection(self):
        """SQLite 데이터베이스 연결을 반환합니다."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # 딕셔너리 형태로 결과 반환
            return conn
        except Exception as e:
            logger.error(f"SQLite 연결 실패: {e}")
            raise
    
    def create_tables(self):
        """발행자 관련 테이블을 생성합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 발행자 정보 테이블 - email을 고유 식별자로 변경
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_issuers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 발행자-쿠폰 매핑 테이블 - issuer_email로 변경
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_issuer_mapping (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    coupon_id INTEGER NOT NULL,
                    issuer_email TEXT NOT NULL,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(coupon_id, issuer_email),
                    FOREIGN KEY (issuer_email) REFERENCES coupon_issuers(email)
                )
            ''')
            
            # 인덱스 생성 - email 기반으로 변경
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_issuer_email ON coupon_issuers(email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_mapping_issuer ON coupon_issuer_mapping(issuer_email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_mapping_coupon ON coupon_issuer_mapping(coupon_id)')
            
            conn.commit()
            conn.close()
            logger.info("발행자 데이터베이스 테이블이 성공적으로 생성되었습니다.")
            
        except Exception as e:
            logger.error(f"테이블 생성 실패: {e}")
            raise
    
    def save_issuer_info(self, name: str, email: str, phone: str = None) -> bool:
        """발행자 정보를 저장하거나 업데이트합니다. email은 필수 매개변수입니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 기존 발행자 확인 - email 기준으로 변경
            cursor.execute("SELECT id, name FROM coupon_issuers WHERE email = ?", (email,))
            existing = cursor.fetchone()
            
            if existing:
                # 업데이트 - 기존 이름이 있으면 그대로 유지
                existing_name = existing[1]
                update_name = existing_name if existing_name else name
                cursor.execute("""
                    UPDATE coupon_issuers 
                    SET name = ?, 
                        phone = COALESCE(?, phone), 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = ?
                """, (update_name, phone, email))
                logger.info(f"발행자 정보 업데이트: {email} (이름 유지: {update_name})")
            else:
                # 새로 삽입
                cursor.execute("""
                    INSERT INTO coupon_issuers (name, email, phone) 
                    VALUES (?, ?, ?)
                """, (name, email, phone))
                logger.info(f"새 발행자 생성: {email}")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"발행자 정보 저장 실패: {e}")
            return False
    
    def get_assigned_coupon_ids(self, issuer_email: str) -> List[int]:
        """특정 발행자에게 할당된 쿠폰 ID 목록을 반환합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT coupon_id FROM coupon_issuer_mapping 
                WHERE issuer_email = ?
                ORDER BY assigned_at DESC
            """, (issuer_email,))
            
            result = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            logger.info(f"발행자 {issuer_email}에게 할당된 쿠폰 ID: {result}")
            return result
            
        except Exception as e:
            logger.error(f"할당된 쿠폰 ID 조회 실패: {e}")
            return []
    
    def assign_coupon_to_issuer(self, name: str, coupon_id: int, email: str, phone: str = None) -> bool:
        """쿠폰을 발행자에게 할당합니다. email은 필수 매개변수입니다."""
        try:
            # 먼저 발행자 정보 저장/업데이트
            self.save_issuer_info(name, email, phone)
            
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 기존 할당이 있는지 확인
            cursor.execute("""
                SELECT issuer_email FROM coupon_issuer_mapping 
                WHERE coupon_id = ?
            """, (coupon_id,))
            existing = cursor.fetchone()
            
            if existing:
                # 기존 할당이 있으면 업데이트
                cursor.execute("""
                    UPDATE coupon_issuer_mapping 
                    SET issuer_email = ?, assigned_at = CURRENT_TIMESTAMP
                    WHERE coupon_id = ?
                """, (email, coupon_id))
                logger.info(f"쿠폰 {coupon_id}의 발행자를 {existing[0]}에서 {email}로 업데이트했습니다.")
            else:
                # 새로운 할당
                cursor.execute("""
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email) 
                    VALUES (?, ?)
                """, (coupon_id, email))
                logger.info(f"쿠폰 {coupon_id}을 발행자 {email}에게 새로 할당했습니다.")
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"쿠폰 할당 실패: {e}")
            return False
    
    def get_all_issuers(self) -> List[Dict]:
        """모든 발행자 정보와 할당된 쿠폰 수를 반환합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    i.name,
                    i.email,
                    i.phone,
                    i.created_at,
                    COUNT(CASE WHEN m.coupon_id IS NOT NULL AND m.coupon_id != 1 THEN 1 END) as coupon_count
                FROM coupon_issuers i
                LEFT JOIN coupon_issuer_mapping m ON i.email = m.issuer_email
                GROUP BY i.name, i.email, i.phone, i.created_at
                ORDER BY i.created_at DESC
            """)
            
            result = []
            for row in cursor.fetchall():
                result.append({
                    'name': row[0],
                    'email': row[1],
                    'phone': row[2],
                    'created_at': row[3],
                    'coupon_count': row[4]
                })
            
            conn.close()
            return result
            
        except Exception as e:
            logger.error(f"발행자 목록 조회 실패: {e}")
            return []
    
    def delete_issuer(self, issuer_email: str) -> bool:
        """발행자를 삭제합니다. 관련된 쿠폰 매핑도 함께 삭제됩니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 먼저 쿠폰 매핑 삭제 - issuer_email로 변경
            cursor.execute("DELETE FROM coupon_issuer_mapping WHERE issuer_email = ?", (issuer_email,))
            
            # 발행자 삭제 - email 기준으로 변경
            cursor.execute("DELETE FROM coupon_issuers WHERE email = ?", (issuer_email,))
            
            # 삭제된 행의 수 확인
            deleted_rows = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            if deleted_rows > 0:
                logger.info(f"발행자 '{issuer_email}'가 성공적으로 삭제되었습니다.")
                return True
            else:
                logger.warning(f"삭제할 발행자 '{issuer_email}'를 찾을 수 없습니다.")
                return False
                
        except Exception as e:
            logger.error(f"발행자 삭제 실패: {e}")
            return False
    
    def test_connection(self) -> Dict:
        """데이터베이스 연결 및 테이블 존재 여부를 테스트합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 테이블 존재 확인
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('coupon_issuers', 'coupon_issuer_mapping')
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
                'database_path': self.db_path,
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

# 전역 인스턴스 생성
issuer_db_service = IssuerDatabaseService() 