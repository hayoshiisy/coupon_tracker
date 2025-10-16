#!/usr/bin/env python3
"""
최종 발행자들에게 쿠폰 매핑 추가 스크립트
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

def add_final_mappings(conn):
    """최종 발행자들에게 쿠폰 매핑을 추가합니다."""
    cursor = conn.cursor()
    
    # 쿠폰-발행자 매핑 데이터
    mappings = [
        (154632, "oh@butfitseoul.com"),
        (154631, "oh@butfitseoul.com"),
        (154467, "bridget@butfitseoul.com"),
        (154466, "bridget@butfitseoul.com"),
        (154465, "sshoon@butfitseoul.com"),
        (154464, "sshoon@butfitseoul.com"),
        (154461, "kwak@butfitseoul.com"),
        (154460, "kwak@butfitseoul.com"),
        (154459, "srjang@butfitseoul.com"),
        (154458, "srjang@butfitseoul.com"),
        (154630, "oh@butfitseoul.com"),
        (154629, "oh@butfitseoul.com"),
        (154457, "bridget@butfitseoul.com"),
        (154456, "bridget@butfitseoul.com"),
        (154455, "sshoon@butfitseoul.com"),
        (154454, "sshoon@butfitseoul.com"),
        (154451, "kwak@butfitseoul.com"),
        (154450, "kwak@butfitseoul.com"),
        (154449, "srjang@butfitseoul.com"),
        (154448, "srjang@butfitseoul.com"),
        (154635, "oh@butfitseoul.com"),
        (154634, "oh@butfitseoul.com"),
        (154633, "oh@butfitseoul.com"),
        (154483, "bridget@butfitseoul.com"),
        (154482, "bridget@butfitseoul.com"),
        (154481, "bridget@butfitseoul.com"),
        (154480, "sshoon@butfitseoul.com"),
        (154479, "sshoon@butfitseoul.com"),
        (154478, "sshoon@butfitseoul.com"),
        (154474, "kwak@butfitseoul.com"),
        (154473, "kwak@butfitseoul.com"),
        (154472, "kwak@butfitseoul.com"),
        (154471, "srjang@butfitseoul.com"),
        (154470, "srjang@butfitseoul.com"),
        (154469, "srjang@butfitseoul.com"),
        (147270, "oh@butfitseoul.com"),
        (147269, "oh@butfitseoul.com"),
        (147268, "oh@butfitseoul.com"),
        (147267, "oh@butfitseoul.com"),
        (147266, "bridget@butfitseoul.com"),
        (147265, "bridget@butfitseoul.com"),
        (147264, "bridget@butfitseoul.com"),
        (147263, "bridget@butfitseoul.com"),
        (147262, "sshoon@butfitseoul.com"),
        (147261, "sshoon@butfitseoul.com"),
        (147260, "sshoon@butfitseoul.com"),
        (147259, "sshoon@butfitseoul.com"),
        (147258, "kwak@butfitseoul.com"),
        (147257, "kwak@butfitseoul.com"),
        (147256, "kwak@butfitseoul.com"),
        (147255, "kwak@butfitseoul.com"),
        (147254, "srjang@butfitseoul.com"),
        (147253, "srjang@butfitseoul.com"),
        (147252, "srjang@butfitseoul.com"),
        (147251, "srjang@butfitseoul.com")
    ]
    
    added_count = 0
    
    for coupon_id, issuer_email in mappings:
        try:
            # 매핑 추가
            cursor.execute("""
                INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email, assigned_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (coupon_id) DO NOTHING
            """, (
                coupon_id,
                issuer_email,
                datetime.now()
            ))
            
            if cursor.rowcount > 0:
                added_count += 1
                logger.info(f"매핑 추가: 쿠폰 {coupon_id} -> {issuer_email}")
            else:
                logger.info(f"매핑 이미 존재: 쿠폰 {coupon_id} -> {issuer_email}")
                
        except Exception as e:
            logger.error(f"매핑 추가 실패 쿠폰 {coupon_id}: {e}")
    
    conn.commit()
    logger.info(f"총 {added_count}개의 매핑이 추가되었습니다.")
    return added_count

def main():
    """메인 실행 함수"""
    try:
        logger.info("최종 쿠폰 매핑 추가 시작...")
        
        # 데이터베이스 연결
        conn = get_database_connection()
        
        # 매핑 추가
        added_count = add_final_mappings(conn)
        
        conn.close()
        
        logger.info(f"쿠폰 매핑 추가 완료: {added_count}개 추가됨")
        return True
        
    except Exception as e:
        logger.error(f"쿠폰 매핑 추가 실패: {e}")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
