#!/usr/bin/env python3
"""
발행자 데이터베이스 디버깅 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from issuer_database import IssuerDatabaseService

def debug_issuer_database():
    """발행자 데이터베이스 상태 확인"""
    issuer_db = IssuerDatabaseService()
    
    # 발행자 정보 확인
    print("=== 발행자 정보 확인 ===")
    issuers = issuer_db.get_all_issuers()
    for issuer in issuers:
        print(f"발행자: {issuer}")
    
    # 특정 발행자의 쿠폰 할당 상태 확인
    target_email = "syha@butfitseoul.com"
    print(f"\n=== 발행자 '{target_email}' 쿠폰 할당 상태 ===")
    
    try:
        conn = issuer_db.get_connection()
        cursor = conn.cursor()
        
        # 쿠폰 할당 매핑 테이블 확인
        cursor.execute("""
            SELECT coupon_id, issuer_email, assigned_at 
            FROM coupon_issuer_mapping 
            WHERE issuer_email = ?
        """, (target_email,))
        
        mappings = cursor.fetchall()
        print(f"할당된 쿠폰 개수: {len(mappings)}")
        
        for mapping in mappings:
            print(f"  쿠폰 ID: {mapping[0]}, 발행자: {mapping[1]}, 할당일: {mapping[2]}")
        
        # 전체 쿠폰 할당 매핑 확인
        print(f"\n=== 전체 쿠폰 할당 매핑 ===")
        cursor.execute("SELECT COUNT(*) FROM coupon_issuer_mapping")
        total_count = cursor.fetchone()[0]
        print(f"전체 할당된 쿠폰 개수: {total_count}")
        
        cursor.execute("""
            SELECT issuer_email, COUNT(*) as count 
            FROM coupon_issuer_mapping 
            GROUP BY issuer_email
        """)
        
        email_counts = cursor.fetchall()
        for email, count in email_counts:
            print(f"  {email}: {count}개")
        
        conn.close()
        
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    debug_issuer_database() 