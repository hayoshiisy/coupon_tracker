#!/usr/bin/env python3
"""
PostgreSQL 데이터베이스 디버깅 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseService

def debug_postgres_coupons():
    """PostgreSQL 데이터베이스의 쿠폰 존재 여부 확인"""
    db_service = DatabaseService()
    
    # 발행자에게 할당된 쿠폰 ID들
    coupon_ids = [148167, 148166, 148165, 147942, 147941, 147724, 147723, 147302, 147301, 147300, 147299]
    
    print(f"=== PostgreSQL 데이터베이스 쿠폰 존재 여부 확인 ===")
    print(f"확인할 쿠폰 ID: {coupon_ids}")
    
    try:
        connection = db_service.get_connection()
        cursor = connection.cursor()
        
        # 쿠폰 ID들이 실제로 존재하는지 확인
        placeholders = ','.join(['%s'] * len(coupon_ids))
        query = f"""
        SELECT a.id, a.title, 
               CASE 
                   WHEN a.title LIKE '%패밀리 쿠폰)%' OR a.title LIKE '%프렌즈 쿠폰)%' THEN 'teamb'
                   WHEN a.title LIKE '%팀버핏%' THEN 'timberland'
                   ELSE 'other'
               END as team_category
        FROM b_payment_bcoupon a
        WHERE a.id IN ({placeholders})
        ORDER BY a.id DESC
        """
        
        print(f"실행할 쿼리: {query}")
        print(f"파라미터: {coupon_ids}")
        
        cursor.execute(query, coupon_ids)
        results = cursor.fetchall()
        
        print(f"\n=== 조회 결과 ===")
        print(f"존재하는 쿠폰 개수: {len(results)}")
        
        if results:
            found_ids = []
            for row in results:
                print(f"행 데이터: {row} (길이: {len(row)})")
                if len(row) >= 3:
                    coupon_id, title, team_category = row
                    found_ids.append(coupon_id)
                    print(f"  ID: {coupon_id}, 제목: {title}, 팀: {team_category}")
                else:
                    print(f"  예상과 다른 행 형식: {row}")
            
            # 존재하지 않는 쿠폰 ID들
            missing_ids = [cid for cid in coupon_ids if cid not in found_ids]
            if missing_ids:
                print(f"\n=== 존재하지 않는 쿠폰 ID들 ===")
                for missing_id in missing_ids:
                    print(f"  ID: {missing_id}")
        else:
            print("조회된 쿠폰이 없습니다.")
        
        # 간단한 존재 여부 확인
        print(f"\n=== 간단한 존재 여부 확인 ===")
        simple_query = f"""
        SELECT COUNT(*) as count
        FROM b_payment_bcoupon a
        WHERE a.id IN ({placeholders})
        """
        
        cursor.execute(simple_query, coupon_ids)
        count_result = cursor.fetchone()
        print(f"존재하는 쿠폰 개수: {count_result[0] if count_result else 0}")
        
        connection.close()
        
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_postgres_coupons() 