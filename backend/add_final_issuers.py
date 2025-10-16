#!/usr/bin/env python3
"""
최종 발행자 5명 추가 스크립트
"""

import psycopg2
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

def add_final_issuers(conn):
    """최종 발행자 5명을 추가합니다."""
    cursor = conn.cursor()
    
    # 추가할 발행자 데이터
    final_issuers = [
        {"name": "오수민", "email": "oh@butfitseoul.com", "phone": None},
        {"name": "정신혜", "email": "bridget@butfitseoul.com", "phone": None},
        {"name": "손상훈", "email": "sshoon@butfitseoul.com", "phone": None},
        {"name": "곽수현", "email": "kwak@butfitseoul.com", "phone": None},
        {"name": "장세림", "email": "srjang@butfitseoul.com", "phone": None}
    ]
    
    added_count = 0
    
    for issuer in final_issuers:
        try:
            # 발행자 추가
            cursor.execute("""
                INSERT INTO coupon_issuers (name, email, phone, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (email) DO NOTHING
            """, (
                issuer["name"],
                issuer["email"],
                issuer["phone"],
                datetime.now(),
                datetime.now()
            ))
            
            if cursor.rowcount > 0:
                added_count += 1
                logger.info(f"발행자 추가: {issuer['name']} ({issuer['email']})")
            else:
                logger.info(f"발행자 이미 존재: {issuer['name']} ({issuer['email']})")
                
        except Exception as e:
            logger.error(f"발행자 추가 실패 {issuer['email']}: {e}")
    
    conn.commit()
    logger.info(f"총 {added_count}명의 발행자가 추가되었습니다.")
    return added_count

def main():
    """메인 실행 함수"""
    try:
        logger.info("최종 발행자 5명 추가 시작...")
        
        # 데이터베이스 연결
        conn = get_database_connection()
        
        # 발행자 추가
        added_count = add_final_issuers(conn)
        
        conn.close()
        
        logger.info(f"발행자 추가 완료: {added_count}명 추가됨")
        return True
        
    except Exception as e:
        logger.error(f"발행자 추가 실패: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
