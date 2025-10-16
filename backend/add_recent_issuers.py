#!/usr/bin/env python3
"""
최근 추가된 발행자 데이터 복구 스크립트
8월 이후 웹사이트에서 추가된 발행자들을 PostgreSQL에 추가합니다.
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

def add_recent_issuers(conn):
    """최근 추가된 발행자들을 데이터베이스에 추가합니다."""
    cursor = conn.cursor()
    
    # 최근 추가된 발행자 정보
    recent_issuers = [
        ("오지영", "jyoh@butfitseoul.com", None),
        ("김영신", "yskim@butfitseoul.com", None),
        ("김해미루", "khmr@butfitseoul.com", None),
        ("김주은", "juny@butfitseoul.com", None),
        ("김준웅", "jukim@butfitseoul.com", None),
        ("이기리", "lgr@butfitseoul.com", None),
        ("이한상", "ryan@butfitseoul.com", None),
        ("이훈채", "hoonee@butfitseoul.com", None),
    ]
    
    added_count = 0
    skipped_count = 0
    
    for name, email, phone in recent_issuers:
        try:
            # 기존 발행자 확인
            cursor.execute("SELECT id FROM coupon_issuers WHERE email = %s", (email,))
            existing = cursor.fetchone()
            
            if existing:
                logger.info(f"발행자 {name} ({email})는 이미 존재합니다. 건너뜁니다.")
                skipped_count += 1
                continue
            
            # 새 발행자 추가
            cursor.execute("""
                INSERT INTO coupon_issuers (name, email, phone, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (name, email, phone, datetime.now(), datetime.now()))
            
            logger.info(f"새 발행자 추가: {name} ({email})")
            added_count += 1
            
        except Exception as e:
            logger.error(f"발행자 {name} ({email}) 추가 실패: {e}")
    
    conn.commit()
    logger.info(f"발행자 추가 완료: {added_count}명 추가, {skipped_count}명 건너뜀")
    return added_count, skipped_count

def verify_addition(conn):
    """추가된 발행자들을 검증합니다."""
    cursor = conn.cursor()
    
    # 최근 추가된 발행자들 확인
    recent_emails = [
        "jyoh@butfitseoul.com",
        "yskim@butfitseoul.com", 
        "khmr@butfitseoul.com",
        "juny@butfitseoul.com",
        "jukim@butfitseoul.com",
        "lgr@butfitseoul.com",
        "ryan@butfitseoul.com",
        "hoonee@butfitseoul.com"
    ]
    
    cursor.execute("""
        SELECT name, email, created_at 
        FROM coupon_issuers 
        WHERE email = ANY(%s)
        ORDER BY created_at DESC
    """, (recent_emails,))
    
    results = cursor.fetchall()
    
    logger.info("추가된 발행자 확인:")
    for name, email, created_at in results:
        logger.info(f"  - {name} ({email}) - {created_at}")
    
    return len(results)

def main():
    """메인 실행 함수"""
    try:
        logger.info("최근 추가된 발행자 데이터 복구 시작...")
        
        # 데이터베이스 연결
        conn = get_database_connection()
        
        # 발행자 추가
        added_count, skipped_count = add_recent_issuers(conn)
        
        # 검증
        verified_count = verify_addition(conn)
        
        conn.close()
        
        logger.info(f"복구 완료: {added_count}명 추가, {verified_count}명 확인됨")
        return True
        
    except Exception as e:
        logger.error(f"복구 실패: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
