#!/usr/bin/env python3
"""
발행자 데이터 복구 스크립트
기존 CSV 파일에서 발행자 데이터를 프로덕션 PostgreSQL 데이터베이스로 복구합니다.
"""

import csv
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_database_connection():
    """프로덕션 데이터베이스 연결을 반환합니다."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL 환경 변수가 설정되지 않았습니다.")
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {e}")
        raise

def create_tables(conn):
    """발행자 관련 테이블을 생성합니다."""
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
    logger.info("테이블 생성 완료")

def restore_issuers(conn, csv_file_path):
    """CSV 파일에서 발행자 데이터를 복구합니다."""
    cursor = conn.cursor()
    
    # 기존 데이터 삭제 (선택사항)
    cursor.execute("DELETE FROM coupon_issuer_mapping")
    cursor.execute("DELETE FROM coupon_issuers")
    logger.info("기존 발행자 데이터 삭제 완료")
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        count = 0
        
        for row in reader:
            if not row['email']:  # 빈 이메일 건너뛰기
                continue
                
            try:
                # 발행자 정보 삽입
                cursor.execute("""
                    INSERT INTO coupon_issuers (name, email, phone, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (email) DO UPDATE SET
                        name = EXCLUDED.name,
                        phone = EXCLUDED.phone,
                        updated_at = EXCLUDED.updated_at
                """, (
                    row['name'],
                    row['email'],
                    row['phone'] if row['phone'] else None,
                    row['created_at'] if row['created_at'] else datetime.now(),
                    row['updated_at'] if row['updated_at'] else datetime.now()
                ))
                count += 1
                
            except Exception as e:
                logger.error(f"발행자 {row['email']} 삽입 실패: {e}")
        
        conn.commit()
        logger.info(f"{count}명의 발행자 데이터 복구 완료")

def restore_mappings(conn, csv_file_path):
    """CSV 파일에서 쿠폰-발행자 매핑 데이터를 복구합니다."""
    cursor = conn.cursor()
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        count = 0
        
        for row in reader:
            if not row['coupon_id'] or not row['issuer_email']:
                continue
                
            try:
                # 매핑 정보 삽입
                cursor.execute("""
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email, assigned_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (coupon_id, issuer_email) DO UPDATE SET
                        assigned_at = EXCLUDED.assigned_at
                """, (
                    int(row['coupon_id']),
                    row['issuer_email'],
                    row['assigned_at'] if row['assigned_at'] else datetime.now()
                ))
                count += 1
                
            except Exception as e:
                logger.error(f"매핑 {row['coupon_id']} -> {row['issuer_email']} 삽입 실패: {e}")
        
        conn.commit()
        logger.info(f"{count}개의 쿠폰-발행자 매핑 복구 완료")

def verify_restoration(conn):
    """복구된 데이터를 검증합니다."""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # 발행자 수 확인
    cursor.execute("SELECT COUNT(*) as count FROM coupon_issuers")
    issuer_count = cursor.fetchone()['count']
    
    # 매핑 수 확인
    cursor.execute("SELECT COUNT(*) as count FROM coupon_issuer_mapping")
    mapping_count = cursor.fetchone()['count']
    
    # 발행자 목록 확인
    cursor.execute("""
        SELECT ci.name, ci.email, COUNT(cim.coupon_id) as coupon_count
        FROM coupon_issuers ci
        LEFT JOIN coupon_issuer_mapping cim ON ci.email = cim.issuer_email
        GROUP BY ci.name, ci.email
        ORDER BY ci.name
    """)
    issuers = cursor.fetchall()
    
    logger.info(f"복구 검증 완료:")
    logger.info(f"- 발행자 수: {issuer_count}")
    logger.info(f"- 매핑 수: {mapping_count}")
    logger.info(f"- 발행자 목록:")
    for issuer in issuers:
        logger.info(f"  * {issuer['name']} ({issuer['email']}) - {issuer['coupon_count']}개 쿠폰")

def main():
    """메인 실행 함수"""
    try:
        # CSV 파일 경로
        issuers_csv = "production_issuers.csv"
        mappings_csv = "production_mappings.csv"
        
        # 파일 존재 확인
        if not os.path.exists(issuers_csv):
            logger.error(f"발행자 CSV 파일을 찾을 수 없습니다: {issuers_csv}")
            return False
        
        if not os.path.exists(mappings_csv):
            logger.error(f"매핑 CSV 파일을 찾을 수 없습니다: {mappings_csv}")
            return False
        
        # 데이터베이스 연결
        logger.info("프로덕션 데이터베이스에 연결 중...")
        conn = get_database_connection()
        
        # 테이블 생성
        create_tables(conn)
        
        # 데이터 복구
        logger.info("발행자 데이터 복구 중...")
        restore_issuers(conn, issuers_csv)
        
        logger.info("쿠폰-발행자 매핑 복구 중...")
        restore_mappings(conn, mappings_csv)
        
        # 검증
        verify_restoration(conn)
        
        conn.close()
        logger.info("발행자 데이터 복구가 성공적으로 완료되었습니다!")
        return True
        
    except Exception as e:
        logger.error(f"복구 실패: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
