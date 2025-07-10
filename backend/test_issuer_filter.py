#!/usr/bin/env python3
"""
발행자 필터링 기능 테스트 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DatabaseService
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')

def test_issuer_filter():
    """발행자 필터링 기능 테스트"""
    db_service = DatabaseService()
    
    print("=== 발행자 필터링 테스트 ===")
    
    # 발행자 필터링 테스트
    issuer_email = "syha@butfitseoul.com"
    
    try:
        result = db_service.get_coupons_from_db(
            team_id="teamb",
            page=1,
            size=10,
            issuer=issuer_email
        )
        
        print(f"결과: {result}")
        print(f"총 쿠폰 수: {result['total']}")
        print(f"반환된 쿠폰 수: {len(result['coupons'])}")
        
        if result['coupons']:
            print("첫 번째 쿠폰:")
            print(f"  ID: {result['coupons'][0]['id']}")
            print(f"  이름: {result['coupons'][0]['name']}")
            print(f"  발행자: {result['coupons'][0].get('issuer', 'N/A')}")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_issuer_filter() 