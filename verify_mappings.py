#!/usr/bin/env python3
"""
쿠폰 매칭 결과 검증 스크립트
추가된 쿠폰 매칭이 정상적으로 저장되었는지 상세히 확인합니다.
"""

import sqlite3
import csv
import sys
import os
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_db_connection(db_path="backend/issuer_database.db"):
    """SQLite 데이터베이스 연결을 반환합니다."""
    return sqlite3.connect(db_path)

def verify_csv_mappings():
    """CSV 파일의 매칭이 데이터베이스에 정상적으로 저장되었는지 확인합니다."""
    csv_file_path = "임직원 쿠폰 매칭 추가_2508.csv"
    
    if not os.path.exists(csv_file_path):
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_file_path}")
        return False
    
    # CSV 파일에서 매칭 데이터 읽기
    csv_mappings = []
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            coupon_id = int(row['id'])
            issuer_email = row['issuer']
            csv_mappings.append((coupon_id, issuer_email))
    
    logger.info(f"CSV 파일에서 {len(csv_mappings)}개의 매칭을 읽었습니다.")
    
    # 데이터베이스에서 확인
    conn = get_db_connection()
    cursor = conn.cursor()
    
    verified_count = 0
    missing_count = 0
    
    logger.info("=== 매칭 검증 결과 ===")
    
    for coupon_id, issuer_email in csv_mappings:
        cursor.execute("""
            SELECT COUNT(*) FROM coupon_issuer_mapping 
            WHERE coupon_id = ? AND issuer_email = ?
        """, (coupon_id, issuer_email))
        
        exists = cursor.fetchone()[0] > 0
        
        if exists:
            verified_count += 1
            logger.info(f"✓ 쿠폰 {coupon_id} → {issuer_email}")
        else:
            missing_count += 1
            logger.error(f"✗ 쿠폰 {coupon_id} → {issuer_email} (누락됨)")
    
    conn.close()
    
    logger.info(f"\n검증 완료: {verified_count}개 확인됨, {missing_count}개 누락됨")
    return missing_count == 0

def show_issuer_summary():
    """발급자별 할당된 쿠폰 수를 요약해서 보여줍니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 새로 추가된 발급자들의 쿠폰 할당 현황
    query = """
    SELECT 
        ci.name,
        ci.email,
        COUNT(cim.coupon_id) as coupon_count,
        GROUP_CONCAT(cim.coupon_id) as coupon_ids
    FROM coupon_issuers ci
    LEFT JOIN coupon_issuer_mapping cim ON ci.email = cim.issuer_email
    WHERE ci.email IN (
        'oh@butfitseoul.com',
        'bridget@butfitseoul.com', 
        'yjpark@butfitseoul.com',
        'sshoon@butfitseoul.com',
        'kwak@butfitseoul.com'
    )
    GROUP BY ci.name, ci.email
    ORDER BY ci.email
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    logger.info("\n=== 새로 추가된 발급자별 쿠폰 할당 현황 ===")
    total_coupons = 0
    
    for name, email, coupon_count, coupon_ids in results:
        logger.info(f"발급자: {name} ({email})")
        logger.info(f"  할당된 쿠폰 수: {coupon_count}개")
        if coupon_ids:
            # 쿠폰 ID들을 정렬해서 표시
            ids = sorted([int(x) for x in coupon_ids.split(',')])
            logger.info(f"  쿠폰 ID: {', '.join(map(str, ids))}")
        logger.info("")
        total_coupons += coupon_count
    
    logger.info(f"총 할당된 쿠폰 수: {total_coupons}개")
    
    conn.close()

def show_database_stats():
    """데이터베이스 전체 통계를 보여줍니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 전체 발급자 수
    cursor.execute("SELECT COUNT(*) FROM coupon_issuers")
    total_issuers = cursor.fetchone()[0]
    
    # 전체 매칭 수
    cursor.execute("SELECT COUNT(*) FROM coupon_issuer_mapping")
    total_mappings = cursor.fetchone()[0]
    
    # 오늘 추가된 매칭 수
    cursor.execute("""
        SELECT COUNT(*) FROM coupon_issuer_mapping 
        WHERE DATE(assigned_at) = DATE('now')
    """)
    today_mappings = cursor.fetchone()[0]
    
    logger.info("=== 데이터베이스 전체 통계 ===")
    logger.info(f"총 발급자 수: {total_issuers}명")
    logger.info(f"총 쿠폰 매칭 수: {total_mappings}개")
    logger.info(f"오늘 추가된 매칭: {today_mappings}개")
    
    conn.close()

def main():
    """메인 실행 함수"""
    logger.info("=== 쿠폰 매칭 결과 검증 시작 ===")
    
    # 데이터베이스 파일 존재 확인
    db_path = "backend/issuer_database.db"
    if not os.path.exists(db_path):
        logger.error(f"데이터베이스 파일을 찾을 수 없습니다: {db_path}")
        return False
    
    # 1. CSV 매칭 검증
    csv_verified = verify_csv_mappings()
    
    # 2. 발급자별 요약
    show_issuer_summary()
    
    # 3. 데이터베이스 통계
    show_database_stats()
    
    logger.info("=== 검증 완료 ===")
    return csv_verified

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

