#!/usr/bin/env python3
"""
발행자 이름 수정 스크립트
잘못된 영문 이름을 올바른 한글 이름으로 수정합니다.
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

def fix_issuer_names(conn):
    """잘못된 발행자 이름을 수정합니다."""
    cursor = conn.cursor()
    
    # 수정할 발행자 정보
    name_corrections = {
        'yjpark@butfitseoul.com': '박영준',
        'khmr@butfitseoul.com': '김해미루'
    }
    
    updated_count = 0
    
    for email, correct_name in name_corrections.items():
        try:
            # 현재 이름 확인
            cursor.execute("SELECT name FROM coupon_issuers WHERE email = %s", (email,))
            current_name = cursor.fetchone()
            
            if current_name:
                logger.info(f"발행자 {email} 이름 수정: '{current_name[0]}' -> '{correct_name}'")
                
                # 이름 업데이트
                cursor.execute("""
                    UPDATE coupon_issuers 
                    SET name = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE email = %s
                """, (correct_name, email))
                
                updated_count += 1
                logger.info(f"발행자 {email} 이름 수정 완료")
            else:
                logger.warning(f"발행자 {email}를 찾을 수 없습니다.")
                
        except Exception as e:
            logger.error(f"발행자 {email} 이름 수정 실패: {e}")
    
    conn.commit()
    logger.info(f"{updated_count}명의 발행자 이름 수정 완료")
    return updated_count

def verify_corrections(conn):
    """수정된 이름을 검증합니다."""
    cursor = conn.cursor()
    
    # 수정된 발행자들 확인
    cursor.execute("""
        SELECT name, email, updated_at 
        FROM coupon_issuers 
        WHERE email IN ('yjpark@butfitseoul.com', 'khmr@butfitseoul.com')
        ORDER BY email
    """)
    
    results = cursor.fetchall()
    
    logger.info("수정된 발행자 확인:")
    for name, email, updated_at in results:
        logger.info(f"  - {name} ({email}) - 수정일: {updated_at}")

def main():
    """메인 실행 함수"""
    try:
        logger.info("발행자 이름 수정 시작...")
        
        # 데이터베이스 연결
        conn = get_database_connection()
        
        # 이름 수정
        updated_count = fix_issuer_names(conn)
        
        # 검증
        verify_corrections(conn)
        
        conn.close()
        logger.info("발행자 이름 수정이 성공적으로 완료되었습니다!")
        return True
        
    except Exception as e:
        logger.error(f"이름 수정 실패: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
