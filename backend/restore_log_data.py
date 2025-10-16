#!/usr/bin/env python3
"""
로그에서 복구된 발행자 데이터 복구 스크립트
Railway 로그에서 추출한 발행자 데이터를 프로덕션 PostgreSQL 데이터베이스에 추가합니다.
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

def restore_log_issuers(conn, csv_file_path):
    """로그에서 복구된 발행자 데이터를 추가합니다."""
    cursor = conn.cursor()
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        count = 0
        
        for row in reader:
            if not row['email']:  # 빈 이메일 건너뛰기
                continue
                
            try:
                # 기존 발행자 확인
                cursor.execute("SELECT id FROM coupon_issuers WHERE email = %s", (row['email'],))
                existing = cursor.fetchone()
                
                if existing:
                    logger.info(f"발행자 {row['email']}는 이미 존재합니다. 건너뜁니다.")
                    continue
                
                # 발행자 정보 삽입
                cursor.execute("""
                    INSERT INTO coupon_issuers (name, email, phone, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    row['name'],
                    row['email'],
                    row['phone'] if row['phone'] else None,
                    row['created_at'] if row['created_at'] else datetime.now(),
                    row['updated_at'] if row['updated_at'] else datetime.now()
                ))
                count += 1
                logger.info(f"새 발행자 추가: {row['name']} ({row['email']})")
                
            except Exception as e:
                logger.error(f"발행자 {row['email']} 삽입 실패: {e}")
        
        conn.commit()
        logger.info(f"{count}명의 발행자 데이터 복구 완료")

def restore_log_mappings(conn, csv_file_path):
    """로그에서 복구된 쿠폰-발행자 매핑 데이터를 추가합니다."""
    cursor = conn.cursor()
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        count = 0
        
        for row in reader:
            if not row['coupon_id'] or not row['issuer_email']:
                continue
                
            try:
                # 기존 매핑 확인
                cursor.execute("SELECT id FROM coupon_issuer_mapping WHERE coupon_id = %s AND issuer_email = %s", 
                             (int(row['coupon_id']), row['issuer_email']))
                existing = cursor.fetchone()
                
                if existing:
                    logger.info(f"매핑 {row['coupon_id']} -> {row['issuer_email']}는 이미 존재합니다. 건너뜁니다.")
                    continue
                
                # 매핑 정보 삽입
                cursor.execute("""
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email, assigned_at)
                    VALUES (%s, %s, %s)
                """, (
                    int(row['coupon_id']),
                    row['issuer_email'],
                    row['assigned_at'] if row['assigned_at'] else datetime.now()
                ))
                count += 1
                logger.info(f"새 매핑 추가: 쿠폰 {row['coupon_id']} -> {row['issuer_email']}")
                
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
    
    # 최근 추가된 발행자들 확인
    cursor.execute("""
        SELECT ci.name, ci.email, COUNT(cim.coupon_id) as coupon_count
        FROM coupon_issuers ci
        LEFT JOIN coupon_issuer_mapping cim ON ci.email = cim.issuer_email
        WHERE ci.created_at >= CURRENT_DATE - INTERVAL '1 day'
        GROUP BY ci.name, ci.email
        ORDER BY ci.created_at DESC
    """)
    recent_issuers = cursor.fetchall()
    
    logger.info(f"복구 검증 완료:")
    logger.info(f"- 총 발행자 수: {issuer_count}")
    logger.info(f"- 총 매핑 수: {mapping_count}")
    logger.info(f"- 최근 추가된 발행자들:")
    for issuer in recent_issuers:
        logger.info(f"  * {issuer['name']} ({issuer['email']}) - {issuer['coupon_count']}개 쿠폰")

def main():
    """메인 실행 함수"""
    try:
        # CSV 파일 경로
        issuers_csv = "final_new_issuers.csv"
        mappings_csv = "final_new_mappings.csv"
        
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
        
        # 데이터 복구
        logger.info("로그에서 복구된 발행자 데이터 추가 중...")
        restore_log_issuers(conn, issuers_csv)
        
        logger.info("로그에서 복구된 쿠폰-발행자 매핑 추가 중...")
        restore_log_mappings(conn, mappings_csv)
        
        # 검증
        verify_restoration(conn)
        
        conn.close()
        logger.info("로그에서 복구된 발행자 데이터 복구가 성공적으로 완료되었습니다!")
        return True
        
    except Exception as e:
        logger.error(f"복구 실패: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
