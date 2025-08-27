#!/usr/bin/env python3
"""
Railway 환경에서 실행할 쿠폰 매칭 동기화 스크립트
"""

import psycopg2
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sync_mappings():
    """새로운 쿠폰 매칭을 PostgreSQL에 추가합니다."""
    # 추가할 매칭 데이터 (하드코딩)
    new_mappings = [
        (154457, 'oh@butfitseoul.com'),
        (154456, 'oh@butfitseoul.com'),
        (154455, 'bridget@butfitseoul.com'),
        (154454, 'bridget@butfitseoul.com'),
        (154453, 'yjpark@butfitseoul.com'),
        (154452, 'yjpark@butfitseoul.com'),
        (154451, 'sshoon@butfitseoul.com'),
        (154450, 'sshoon@butfitseoul.com'),
        (154449, 'kwak@butfitseoul.com'),
        (154448, 'kwak@butfitseoul.com'),
        (154467, 'oh@butfitseoul.com'),
        (154466, 'oh@butfitseoul.com'),
        (154465, 'bridget@butfitseoul.com'),
        (154464, 'bridget@butfitseoul.com'),
        (154463, 'yjpark@butfitseoul.com'),
        (154462, 'yjpark@butfitseoul.com'),
        (154461, 'sshoon@butfitseoul.com'),
        (154460, 'sshoon@butfitseoul.com'),
        (154459, 'kwak@butfitseoul.com'),
        (154458, 'kwak@butfitseoul.com'),
        (154483, 'oh@butfitseoul.com'),
        (154482, 'oh@butfitseoul.com'),
        (154481, 'oh@butfitseoul.com'),
        (154480, 'bridget@butfitseoul.com'),
        (154479, 'bridget@butfitseoul.com'),
        (154478, 'bridget@butfitseoul.com'),
        (154477, 'yjpark@butfitseoul.com'),
        (154476, 'yjpark@butfitseoul.com'),
        (154475, 'yjpark@butfitseoul.com'),
        (154474, 'sshoon@butfitseoul.com'),
        (154473, 'sshoon@butfitseoul.com'),
        (154472, 'sshoon@butfitseoul.com'),
        (154471, 'kwak@butfitseoul.com'),
        (154470, 'kwak@butfitseoul.com'),
        (154469, 'kwak@butfitseoul.com'),
    ]
    
    try:
        # Railway PostgreSQL 연결
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            logger.error("DATABASE_URL 환경 변수가 설정되지 않았습니다.")
            return False
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        success_count = 0
        
        for coupon_id, issuer_email in new_mappings:
            try:
                issuer_name = issuer_email.split('@')[0]
                
                # 발급자 정보 저장/업데이트
                cursor.execute("""
                    INSERT INTO coupon_issuers (name, email, created_at, updated_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (email) DO UPDATE SET
                        name = COALESCE(EXCLUDED.name, coupon_issuers.name),
                        updated_at = CURRENT_TIMESTAMP
                """, (issuer_name, issuer_email))
                
                # 쿠폰 매칭 추가
                cursor.execute("""
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email, assigned_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (coupon_id, issuer_email) DO NOTHING
                """, (coupon_id, issuer_email))
                
                success_count += 1
                logger.info(f"✓ 쿠폰 {coupon_id} → {issuer_email}")
                
            except Exception as e:
                logger.error(f"✗ 쿠폰 {coupon_id} → {issuer_email}: {e}")
        
        conn.commit()
        conn.close()
        
        logger.info(f"동기화 완료: {success_count}개 성공")
        return True
        
    except Exception as e:
        logger.error(f"동기화 실패: {e}")
        return False

if __name__ == "__main__":
    sync_mappings()
