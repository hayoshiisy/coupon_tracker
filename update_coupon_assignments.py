#!/usr/bin/env python3
"""
쿠폰-발행자 매칭 업데이트 - coupon_issuer_matching.csv 파일로 쿠폰 할당 정보 업데이트
"""

import sqlite3
import csv
import os
from datetime import datetime

def update_coupon_assignments():
    """CSV 파일의 데이터로 coupon_issuer_mapping 테이블을 업데이트합니다."""
    
    # 데이터베이스 파일 경로
    db_path = os.path.join('backend', 'issuer_database.db')
    csv_path = 'coupon_issuer_matching.csv'
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_path}")
        return False
    
    try:
        # SQLite 데이터베이스 연결
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=== 기존 쿠폰 할당 데이터 삭제 ===")
        # 기존 쿠폰 할당 데이터 모두 삭제
        cursor.execute("DELETE FROM coupon_issuer_mapping")
        deleted_count = cursor.rowcount
        print(f"삭제된 기존 할당 수: {deleted_count}")
        
        print("\n=== CSV 파일 읽기 ===")
        # CSV 파일 읽기
        new_assignments = []
        skipped_count = 0
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                coupon_id = row['id'].strip()
                issuer_email = row['issuer'].strip()
                
                # 빈 값이나 잘못된 데이터 건너뛰기
                if not coupon_id or not issuer_email or issuer_email == '%':
                    skipped_count += 1
                    continue
                    
                try:
                    coupon_id = int(coupon_id)
                    new_assignments.append((coupon_id, issuer_email))
                except ValueError:
                    skipped_count += 1
                    continue
        
        print(f"CSV에서 읽은 유효한 할당 수: {len(new_assignments)}")
        print(f"건너뛴 잘못된 데이터 수: {skipped_count}")
        
        print("\n=== 발행자 존재 여부 확인 ===")
        # 모든 발행자 이메일 조회
        cursor.execute("SELECT email FROM coupon_issuers")
        existing_issuers = {row[0] for row in cursor.fetchall()}
        print(f"데이터베이스에 등록된 발행자 수: {len(existing_issuers)}")
        
        # 유효한 발행자만 필터링
        valid_assignments = []
        invalid_issuers = set()
        for coupon_id, issuer_email in new_assignments:
            if issuer_email in existing_issuers:
                valid_assignments.append((coupon_id, issuer_email))
            else:
                invalid_issuers.add(issuer_email)
        
        print(f"유효한 할당 수: {len(valid_assignments)}")
        if invalid_issuers:
            print(f"⚠️ 등록되지 않은 발행자 ({len(invalid_issuers)}명): {list(invalid_issuers)[:5]}...")
        
        print("\n=== 새 할당 데이터 삽입 ===")
        # 새 할당 데이터 삽입
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        insert_query = """
        INSERT INTO coupon_issuer_mapping (coupon_id, issuer_email, assigned_at)
        VALUES (?, ?, ?)
        """
        
        inserted_count = 0
        error_count = 0
        for coupon_id, issuer_email in valid_assignments:
            try:
                cursor.execute(insert_query, (coupon_id, issuer_email, current_time))
                inserted_count += 1
                if inserted_count <= 5:  # 처음 5개만 출력
                    print(f"  ✓ 삽입: 쿠폰 {coupon_id} → {issuer_email}")
                elif inserted_count == 6:
                    print("  ...")
            except sqlite3.IntegrityError as e:
                error_count += 1
                if error_count <= 3:  # 처음 3개 오류만 출력
                    print(f"  ⚠️ 중복 또는 오류: 쿠폰 {coupon_id} → {issuer_email} - {e}")
                continue
        
        # 변경사항 커밋
        conn.commit()
        
        print(f"\n=== 완료 ===")
        print(f"✅ 총 {inserted_count}개의 쿠폰 할당이 성공적으로 삽입되었습니다.")
        if error_count > 0:
            print(f"⚠️ {error_count}개의 할당에서 오류가 발생했습니다.")
        
        # 결과 확인
        cursor.execute("SELECT COUNT(*) FROM coupon_issuer_mapping")
        total_count = cursor.fetchone()[0]
        print(f"📊 현재 데이터베이스의 총 할당 수: {total_count}")
        
        # 발행자별 할당 수 확인
        print(f"\n=== 발행자별 할당 수 (상위 10명) ===")
        cursor.execute("""
            SELECT cim.issuer_email, ci.name, COUNT(*) as coupon_count
            FROM coupon_issuer_mapping cim
            JOIN coupon_issuers ci ON cim.issuer_email = ci.email
            GROUP BY cim.issuer_email, ci.name
            ORDER BY coupon_count DESC
            LIMIT 10
        """)
        results = cursor.fetchall()
        for row in results:
            print(f"  {row[1]} ({row[0]}): {row[2]}개 쿠폰")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("쿠폰-발행자 할당 테이블 업데이트 시작")
    print("=" * 50)
    
    success = update_coupon_assignments()
    
    if success:
        print("\n🎉 모든 작업이 성공적으로 완료되었습니다!")
        print("\n📋 다음 단계:")
        print("1. 백엔드 서버 재시작")
        print("2. http://localhost:3000/team/teamb 페이지 확인")
        print("3. http://localhost:3000/issuer/dashboard 페이지 확인")
    else:
        print("\n❌ 작업 중 오류가 발생했습니다.") 