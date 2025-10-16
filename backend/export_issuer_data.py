#!/usr/bin/env python3
"""
프로덕션 데이터베이스에서 발행자 데이터를 CSV로 추출하는 스크립트
"""

import psycopg2
import csv
import os
import logging
from datetime import datetime

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

def export_issuers_to_csv(conn):
    """발행자 데이터를 CSV로 추출합니다."""
    cursor = conn.cursor()
    
    # 발행자 데이터 조회
    cursor.execute("""
        SELECT id, name, email, phone, created_at, updated_at
        FROM coupon_issuers
        ORDER BY created_at DESC
    """)
    
    issuers = cursor.fetchall()
    
    # CSV 파일 생성
    with open('coupon_issuers_export.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['id', 'name', 'email', 'phone', 'created_at', 'updated_at'])
        
        for issuer in issuers:
            writer.writerow(issuer)
    
    logger.info(f"발행자 데이터 {len(issuers)}개를 coupon_issuers_export.csv로 추출했습니다.")
    return len(issuers)

def export_mappings_to_csv(conn):
    """쿠폰-발행자 매핑 데이터를 CSV로 추출합니다."""
    cursor = conn.cursor()
    
    # 매핑 데이터 조회
    cursor.execute("""
        SELECT id, coupon_id, issuer_email, assigned_at
        FROM coupon_issuer_mapping
        ORDER BY assigned_at DESC
    """)
    
    mappings = cursor.fetchall()
    
    # CSV 파일 생성
    with open('coupon_issuer_mapping_export.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['id', 'coupon_id', 'issuer_email', 'assigned_at'])
        
        for mapping in mappings:
            writer.writerow(mapping)
    
    logger.info(f"매핑 데이터 {len(mappings)}개를 coupon_issuer_mapping_export.csv로 추출했습니다.")
    return len(mappings)

def main():
    """메인 실행 함수"""
    try:
        logger.info("프로덕션 데이터베이스에서 발행자 데이터 추출 시작...")
        
        # 데이터베이스 연결
        conn = get_database_connection()
        
        # 데이터 추출
        issuer_count = export_issuers_to_csv(conn)
        mapping_count = export_mappings_to_csv(conn)
        
        conn.close()
        
        logger.info(f"데이터 추출 완료:")
        logger.info(f"- 발행자: {issuer_count}개")
        logger.info(f"- 매핑: {mapping_count}개")
        logger.info(f"- 파일: coupon_issuers_export.csv, coupon_issuer_mapping_export.csv")
        
        return True
        
    except Exception as e:
        logger.error(f"데이터 추출 실패: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
