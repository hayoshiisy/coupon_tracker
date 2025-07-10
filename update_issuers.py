#!/usr/bin/env python3
"""
임직원 쿠폰 관리 - 직원 정보.csv 파일로 coupon_issuers 테이블 업데이트
"""

import sqlite3
import csv
import os
from datetime import datetime

def update_coupon_issuers():
    """CSV 파일의 데이터로 coupon_issuers 테이블을 업데이트합니다."""
    
    # 데이터베이스 파일 경로
    db_path = os.path.join('backend', 'issuer_database.db')
    csv_path = '임직원 쿠폰 관리 - 직원 정보.csv'
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return False
    
    try:
        # SQLite 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=== 기존 데이터 삭제 ===")
        # 기존 데이터 모두 삭제
        cursor.execute("DELETE FROM coupon_issuers")
        deleted_count = cursor.rowcount
        print(f"삭제된 기존 발행자 수: {deleted_count}")
        
        print("\n=== CSV 파일 읽기 ===")
        # CSV 파일 읽기
        new_issuers = []
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                name = row['name'].strip()
                email = row['email'].strip()
                if name and email:  # 빈 값이 아닌 경우만 추가
                    new_issuers.append((name, email))
        
        print(f"CSV에서 읽은 발행자 수: {len(new_issuers)}")
        
        print("\n=== 새 데이터 삽입 ===")
        # 새 데이터 삽입
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        insert_query = """
        INSERT INTO coupon_issuers (name, email, phone, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?)
        """
        
        inserted_count = 0
        for name, email in new_issuers:
            try:
                cursor.execute(insert_query, (name, email, current_time, current_time))
                inserted_count += 1
                print(f"  ✓ 삽입: {name} ({email})")
            except sqlite3.IntegrityError as e:
                print(f"  ⚠️ 중복 데이터 건너뛰기: {name} ({email}) - {e}")
                continue
        
        # 변경사항 커밋
        conn.commit()
        
        print(f"\n=== 완료 ===")
        print(f"✅ 총 {inserted_count}개의 발행자 정보가 성공적으로 삽입되었습니다.")
        
        # 결과 확인
        cursor.execute("SELECT COUNT(*) FROM coupon_issuers")
        total_count = cursor.fetchone()[0]
        print(f"📊 현재 데이터베이스의 총 발행자 수: {total_count}")
        
        # 샘플 데이터 출력
        print(f"\n=== 샘플 데이터 (처음 5개) ===")
        cursor.execute("SELECT id, name, email, created_at FROM coupon_issuers LIMIT 5")
        results = cursor.fetchall()
        for row in results:
            print(f"  ID: {row[0]}, 이름: {row[1]}, 이메일: {row[2]}, 생성일: {row[3]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("coupon_issuers 테이블 업데이트 시작")
    print("=" * 50)
    
    success = update_coupon_issuers()
    
    if success:
        print("\n🎉 모든 작업이 성공적으로 완료되었습니다!")
    else:
        print("\n�� 작업 중 오류가 발생했습니다.") 