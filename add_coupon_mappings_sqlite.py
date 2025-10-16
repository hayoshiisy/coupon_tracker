#!/usr/bin/env python3
"""
임직원 쿠폰 매칭 추가 스크립트 (SQLite 버전)
CSV 파일에서 쿠폰 ID와 발급자 이메일을 읽어 SQLite 데이터베이스에 매칭 정보를 추가합니다.
"""

import csv
import sqlite3
import sys
import os
import logging
from pathlib import Path

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SQLiteIssuerService:
    """SQLite 기반 발급자 관리 서비스"""
    
    def __init__(self, db_path="backend/issuer_database.db"):
        self.db_path = db_path
        self.create_tables()
    
    def get_connection(self):
        """SQLite 데이터베이스 연결을 반환합니다."""
        return sqlite3.connect(self.db_path)
    
    def create_tables(self):
        """필요한 테이블을 생성합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 발행자 정보 테이블
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
            
            # 발행자-쿠폰 매핑 테이블
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS coupon_issuer_mapping (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    coupon_id INTEGER NOT NULL,
                    issuer_email TEXT NOT NULL,
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(coupon_id, issuer_email)
                )
            ''')
            
            # 인덱스 생성
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_issuer_email ON coupon_issuers(email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_mapping_issuer ON coupon_issuer_mapping(issuer_email)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_mapping_coupon ON coupon_issuer_mapping(coupon_id)')
            
            conn.commit()
            conn.close()
            logger.info("SQLite 테이블이 성공적으로 생성되었습니다.")
            
        except Exception as e:
            logger.error(f"테이블 생성 실패: {e}")
            raise
    
    def save_issuer_info(self, name: str, email: str, phone: str = None) -> bool:
        """발행자 정보를 저장하거나 업데이트합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 기존 발행자 확인
            cursor.execute("SELECT id, name FROM coupon_issuers WHERE email = ?", (email,))
            existing = cursor.fetchone()
            
            if existing:
                # 업데이트 (이름이 비어있는 경우만 업데이트)
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
    
    def assign_coupon_to_issuer(self, name: str, coupon_id: int, email: str, phone: str = None) -> bool:
        """쿠폰을 발행자에게 할당합니다."""
        try:
            # 먼저 발행자 정보 저장/업데이트
            self.save_issuer_info(name, email, phone)
            
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 기존 할당 확인
            cursor.execute("SELECT issuer_email FROM coupon_issuer_mapping WHERE coupon_id = ?", (coupon_id,))
            existing = cursor.fetchone()
            
            if existing:
                # 기존 할당이 있으면 업데이트
                old_email = existing[0]
                cursor.execute("""
                    UPDATE coupon_issuer_mapping 
                    SET issuer_email = ?, assigned_at = CURRENT_TIMESTAMP 
                    WHERE coupon_id = ?
                """, (email, coupon_id))
                logger.info(f"쿠폰 {coupon_id}의 발행자를 {old_email}에서 {email}로 업데이트했습니다.")
            else:
                # 새로운 할당
                cursor.execute("""
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email) 
                    VALUES (?, ?)
                """, (coupon_id, email))
                logger.info(f"쿠폰 {coupon_id}를 발행자 {email}에게 할당했습니다.")
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"쿠폰 할당 실패: {e}")
            return False
    
    def get_assigned_coupon_ids(self, issuer_email: str) -> list:
        """특정 발행자에게 할당된 쿠폰 ID 목록을 조회합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT coupon_id FROM coupon_issuer_mapping 
                WHERE issuer_email = ?
                ORDER BY assigned_at DESC
            """, (issuer_email,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [row[0] for row in results]
            
        except Exception as e:
            logger.error(f"할당된 쿠폰 조회 실패: {e}")
            return []
    
    def get_all_issuers(self) -> list:
        """모든 발행자와 할당된 쿠폰 수를 조회합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
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
            
            # 딕셔너리 형태로 변환
            issuers = []
            for row in results:
                issuers.append({
                    'name': row[0],
                    'email': row[1],
                    'phone': row[2],
                    'created_at': row[3],
                    'coupon_count': row[4]
                })
            
            return issuers
            
        except Exception as e:
            logger.error(f"발행자 목록 조회 실패: {e}")
            return []
    
    def test_connection(self) -> dict:
        """데이터베이스 연결 및 테이블 존재 여부를 테스트합니다."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 테이블 존재 확인
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                AND name IN ('coupon_issuers', 'coupon_issuer_mapping')
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
                'database_type': 'SQLite',
                'database_path': self.db_path,
                'database_exists': os.path.exists(self.db_path),
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

def read_csv_file(csv_path: str) -> list:
    """CSV 파일을 읽어서 쿠폰 매칭 데이터를 반환합니다."""
    mappings = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row_num, row in enumerate(reader, start=2):  # 헤더 다음부터 시작
                coupon_id = row.get('id', '').strip()
                issuer_email = row.get('issuer', '').strip()
                
                if not coupon_id or not issuer_email:
                    logger.warning(f"행 {row_num}: 빈 데이터 건너뜀 (ID: '{coupon_id}', 발급자: '{issuer_email}')")
                    continue
                
                try:
                    coupon_id = int(coupon_id)
                    mappings.append({
                        'coupon_id': coupon_id,
                        'issuer_email': issuer_email,
                        'row_num': row_num
                    })
                except ValueError:
                    logger.error(f"행 {row_num}: 잘못된 쿠폰 ID 형식: '{coupon_id}'")
                    continue
        
        logger.info(f"CSV 파일에서 {len(mappings)}개의 매칭 데이터를 읽었습니다.")
        return mappings
        
    except FileNotFoundError:
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_path}")
        return []
    except Exception as e:
        logger.error(f"CSV 파일 읽기 실패: {e}")
        return []

def add_coupon_mappings(service: SQLiteIssuerService, mappings: list) -> dict:
    """쿠폰 매칭 데이터를 데이터베이스에 추가합니다."""
    results = {
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
    }
    
    for mapping in mappings:
        coupon_id = mapping['coupon_id']
        issuer_email = mapping['issuer_email']
        row_num = mapping['row_num']
        
        try:
            # 발급자 이름은 이메일에서 @ 앞부분을 사용
            issuer_name = issuer_email.split('@')[0]
            
            # 쿠폰을 발급자에게 할당
            success = service.assign_coupon_to_issuer(
                name=issuer_name,
                coupon_id=coupon_id,
                email=issuer_email
            )
            
            if success:
                results['success'] += 1
                logger.info(f"✓ 행 {row_num}: 쿠폰 {coupon_id} → {issuer_email} 매칭 성공")
            else:
                results['failed'] += 1
                error_msg = f"행 {row_num}: 쿠폰 {coupon_id} → {issuer_email} 매칭 실패"
                results['errors'].append(error_msg)
                logger.error(f"✗ {error_msg}")
                
        except Exception as e:
            results['failed'] += 1
            error_msg = f"행 {row_num}: 쿠폰 {coupon_id} → {issuer_email} 처리 중 오류: {e}"
            results['errors'].append(error_msg)
            logger.error(f"✗ {error_msg}")
    
    return results

def verify_mappings(service: SQLiteIssuerService, mappings: list) -> dict:
    """추가된 매칭이 정상적으로 저장되었는지 확인합니다."""
    verification_results = {
        'verified': 0,
        'missing': 0,
        'errors': []
    }
    
    logger.info("매칭 결과 검증 중...")
    
    for mapping in mappings:
        coupon_id = mapping['coupon_id']
        issuer_email = mapping['issuer_email']
        
        try:
            # 해당 발급자에게 할당된 쿠폰 ID 목록 조회
            assigned_coupon_ids = service.get_assigned_coupon_ids(issuer_email)
            
            if coupon_id in assigned_coupon_ids:
                verification_results['verified'] += 1
                logger.debug(f"✓ 쿠폰 {coupon_id} → {issuer_email} 매칭 확인됨")
            else:
                verification_results['missing'] += 1
                error_msg = f"쿠폰 {coupon_id} → {issuer_email} 매칭이 데이터베이스에서 확인되지 않음"
                verification_results['errors'].append(error_msg)
                logger.warning(f"⚠ {error_msg}")
                
        except Exception as e:
            verification_results['missing'] += 1
            error_msg = f"쿠폰 {coupon_id} → {issuer_email} 검증 중 오류: {e}"
            verification_results['errors'].append(error_msg)
            logger.error(f"✗ {error_msg}")
    
    return verification_results

def main():
    """메인 실행 함수"""
    logger.info("=== 임직원 쿠폰 매칭 추가 스크립트 시작 (SQLite 버전) ===")
    
    # CSV 파일 경로
    csv_file_path = "임직원 쿠폰 매칭 추가_2508.csv"
    
    if not os.path.exists(csv_file_path):
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_file_path}")
        logger.info("현재 디렉토리의 파일 목록:")
        for file in os.listdir('.'):
            if file.endswith('.csv'):
                logger.info(f"  - {file}")
        return False
    
    # SQLite 서비스 초기화
    service = SQLiteIssuerService()
    
    # 1. CSV 파일 읽기
    logger.info(f"CSV 파일 읽는 중: {csv_file_path}")
    mappings = read_csv_file(csv_file_path)
    
    if not mappings:
        logger.error("처리할 매칭 데이터가 없습니다.")
        return False
    
    # 2. 데이터베이스 연결 테스트
    logger.info("데이터베이스 연결 테스트 중...")
    db_test = service.test_connection()
    if db_test['status'] != 'success':
        logger.error(f"데이터베이스 연결 실패: {db_test.get('error', '알 수 없는 오류')}")
        return False
    
    logger.info(f"데이터베이스 연결 성공: {db_test['database_type']}")
    logger.info(f"데이터베이스 경로: {db_test['database_path']}")
    logger.info(f"현재 발급자 수: {db_test['issuer_count']}, 매칭 수: {db_test['mapping_count']}")
    
    # 3. 쿠폰 매칭 추가
    logger.info(f"{len(mappings)}개의 쿠폰 매칭을 데이터베이스에 추가 중...")
    results = add_coupon_mappings(service, mappings)
    
    # 4. 결과 출력
    logger.info("=== 처리 결과 ===")
    logger.info(f"성공: {results['success']}개")
    logger.info(f"실패: {results['failed']}개")
    logger.info(f"건너뜀: {results['skipped']}개")
    
    if results['errors']:
        logger.info("오류 목록:")
        for error in results['errors']:
            logger.error(f"  - {error}")
    
    # 5. 매칭 결과 검증
    if results['success'] > 0:
        logger.info("매칭 결과 검증 중...")
        verification = verify_mappings(service, mappings)
        
        logger.info("=== 검증 결과 ===")
        logger.info(f"확인됨: {verification['verified']}개")
        logger.info(f"누락됨: {verification['missing']}개")
        
        if verification['errors']:
            logger.info("검증 오류:")
            for error in verification['errors']:
                logger.warning(f"  - {error}")
    
    # 6. 최종 상태 확인
    final_test = service.test_connection()
    if final_test['status'] == 'success':
        logger.info(f"최종 발급자 수: {final_test['issuer_count']}, 매칭 수: {final_test['mapping_count']}")
    
    logger.info("=== 스크립트 완료 ===")
    return results['success'] > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

