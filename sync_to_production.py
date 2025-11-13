#!/usr/bin/env python3
"""
로컬 SQLite 데이터를 운영 PostgreSQL 데이터베이스에 동기화하는 스크립트
"""

import sqlite3
import psycopg2
import csv
import sys
import os
import logging
from pathlib import Path

# 백엔드 모듈을 import하기 위해 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# 환경 변수 설정 (config.py의 설정을 사용)
from config import DatabaseConfig

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_sqlite_connection(db_path="backend/issuer_database.db"):
    """SQLite 데이터베이스 연결을 반환합니다."""
    return sqlite3.connect(db_path)

def get_postgresql_connection():
    """PostgreSQL 데이터베이스 연결을 반환합니다."""
    # 환경 변수에서 데이터베이스 연결 정보 가져오기
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        raise ValueError(
            "DATABASE_URL 환경 변수가 설정되지 않았습니다. "
            "Railway 환경 변수에서 DATABASE_URL을 설정해주세요."
        )
    
    return psycopg2.connect(database_url)

def export_new_mappings_to_csv():
    """새로 추가된 매칭을 CSV 파일로 내보냅니다."""
    csv_file_path = "임직원 쿠폰 매칭 추가_2508.csv"
    
    if not os.path.exists(csv_file_path):
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_file_path}")
        return []
    
    # CSV 파일에서 매칭 데이터 읽기
    mappings = []
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            coupon_id = int(row['id'])
            issuer_email = row['issuer']
            mappings.append((coupon_id, issuer_email))
    
    logger.info(f"CSV에서 {len(mappings)}개의 매칭을 읽었습니다.")
    return mappings

def sync_to_postgresql():
    """로컬 SQLite의 새로운 매칭을 PostgreSQL에 동기화합니다."""
    try:
        # 새로 추가된 매칭 데이터 가져오기
        new_mappings = export_new_mappings_to_csv()
        
        if not new_mappings:
            logger.error("동기화할 매칭 데이터가 없습니다.")
            return False
        
        # PostgreSQL 연결 (실제로는 외부 접근이 필요)
        logger.warning("⚠️  주의: 이 스크립트는 Railway 내부에서 실행되어야 합니다.")
        logger.info("로컬에서는 다음 방법 중 하나를 사용하세요:")
        logger.info("1. Railway CLI를 통한 배포")
        logger.info("2. GitHub 푸시 후 자동 배포")
        logger.info("3. Railway 대시보드에서 수동 실행")
        
        # 실제 동기화 코드 (Railway 환경에서만 작동)
        """
        conn = get_postgresql_connection()
        cursor = conn.cursor()
        
        success_count = 0
        for coupon_id, issuer_email in new_mappings:
            try:
                # 발급자 이름은 이메일에서 @ 앞부분 사용
                issuer_name = issuer_email.split('@')[0]
                
                # 발급자 정보 먼저 저장/업데이트
                cursor.execute('''
                    INSERT INTO coupon_issuers (name, email, created_at, updated_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (email) DO UPDATE SET
                        name = COALESCE(EXCLUDED.name, coupon_issuers.name),
                        updated_at = CURRENT_TIMESTAMP
                ''', (issuer_name, issuer_email))
                
                # 쿠폰 매칭 추가
                cursor.execute('''
                    INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email, assigned_at)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (coupon_id, issuer_email) DO NOTHING
                ''', (coupon_id, issuer_email))
                
                success_count += 1
                logger.info(f"✓ 쿠폰 {coupon_id} → {issuer_email}")
                
            except Exception as e:
                logger.error(f"✗ 쿠폰 {coupon_id} → {issuer_email}: {e}")
        
        conn.commit()
        conn.close()
        
        logger.info(f"동기화 완료: {success_count}개 성공")
        """
        
        return True
        
    except Exception as e:
        logger.error(f"동기화 실패: {e}")
        return False

def create_deployment_script():
    """배포용 스크립트를 생성합니다."""
    script_content = '''#!/usr/bin/env python3
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
'''
    
    with open('backend/sync_production_mappings.py', 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    logger.info("배포용 스크립트가 생성되었습니다: backend/sync_production_mappings.py")

def main():
    """메인 실행 함수"""
    logger.info("=== 운영 환경 동기화 준비 ===")
    
    # 1. 배포용 스크립트 생성
    create_deployment_script()
    
    # 2. 동기화 시도 (로컬에서는 실패할 것임)
    sync_to_postgresql()
    
    logger.info("\n=== 운영 환경 반영 방법 ===")
    logger.info("1. 생성된 스크립트를 Git에 커밋하고 푸시")
    logger.info("2. Railway 대시보드에서 backend/sync_production_mappings.py 실행")
    logger.info("3. 또는 Railway CLI 사용: railway run python sync_production_mappings.py")
    
    return True

if __name__ == "__main__":
    main()

