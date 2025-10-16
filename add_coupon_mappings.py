#!/usr/bin/env python3
"""
임직원 쿠폰 매칭 추가 스크립트
CSV 파일에서 쿠폰 ID와 발급자 이메일을 읽어 데이터베이스에 매칭 정보를 추가합니다.
"""

import csv
import sys
import os
import logging
from pathlib import Path

# 백엔드 모듈을 import하기 위해 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# 환경 변수 설정 (config.py의 설정을 사용)
from config import DatabaseConfig
os.environ['DATABASE_URL'] = DatabaseConfig.get_connection_string()

from issuer_database import issuer_db_service

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def read_csv_file(csv_path: str) -> list:
    """CSV 파일을 읽어서 쿠폰 매칭 데이터를 반환합니다."""
    mappings = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row_num, row in enumerate(reader, start=2):  # 헤더 다음부터 시작
                coupon_id = row.get('id', '').strip()
                issuer_email = row.get('issuer', '').strip()
                
                if not coupon_id or not issuer_email:
                    logger.warning(f"행 {row_num}: 빈 데이터 건너뜀 (ID: '{coupon_id}', 발급자: '{issuer_email}')")
                    continue
                
                try:
                    coupon_id = int(coupon_id)
                    mappings.append({
                        'coupon_id': coupon_id,
                        'issuer_email': issuer_email,
                        'row_num': row_num
                    })
                except ValueError:
                    logger.error(f"행 {row_num}: 잘못된 쿠폰 ID 형식: '{coupon_id}'")
                    continue
        
        logger.info(f"CSV 파일에서 {len(mappings)}개의 매칭 데이터를 읽었습니다.")
        return mappings
        
    except FileNotFoundError:
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_path}")
        return []
    except Exception as e:
        logger.error(f"CSV 파일 읽기 실패: {e}")
        return []

def add_coupon_mappings(mappings: list) -> dict:
    """쿠폰 매칭 데이터를 데이터베이스에 추가합니다."""
    results = {
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'errors': []
    }
    
    for mapping in mappings:
        coupon_id = mapping['coupon_id']
        issuer_email = mapping['issuer_email']
        row_num = mapping['row_num']
        
        try:
            # 발급자 이름은 이메일에서 @ 앞부분을 사용
            issuer_name = issuer_email.split('@')[0]
            
            # 쿠폰을 발급자에게 할당
            success = issuer_db_service.assign_coupon_to_issuer(
                name=issuer_name,
                coupon_id=coupon_id,
                email=issuer_email
            )
            
            if success:
                results['success'] += 1
                logger.info(f"✓ 행 {row_num}: 쿠폰 {coupon_id} → {issuer_email} 매칭 성공")
            else:
                results['failed'] += 1
                error_msg = f"행 {row_num}: 쿠폰 {coupon_id} → {issuer_email} 매칭 실패"
                results['errors'].append(error_msg)
                logger.error(f"✗ {error_msg}")
                
        except Exception as e:
            results['failed'] += 1
            error_msg = f"행 {row_num}: 쿠폰 {coupon_id} → {issuer_email} 처리 중 오류: {e}"
            results['errors'].append(error_msg)
            logger.error(f"✗ {error_msg}")
    
    return results

def verify_mappings(mappings: list) -> dict:
    """추가된 매칭이 정상적으로 저장되었는지 확인합니다."""
    verification_results = {
        'verified': 0,
        'missing': 0,
        'errors': []
    }
    
    logger.info("매칭 결과 검증 중...")
    
    for mapping in mappings:
        coupon_id = mapping['coupon_id']
        issuer_email = mapping['issuer_email']
        
        try:
            # 해당 발급자에게 할당된 쿠폰 ID 목록 조회
            assigned_coupon_ids = issuer_db_service.get_assigned_coupon_ids(issuer_email)
            
            if coupon_id in assigned_coupon_ids:
                verification_results['verified'] += 1
                logger.debug(f"✓ 쿠폰 {coupon_id} → {issuer_email} 매칭 확인됨")
            else:
                verification_results['missing'] += 1
                error_msg = f"쿠폰 {coupon_id} → {issuer_email} 매칭이 데이터베이스에서 확인되지 않음"
                verification_results['errors'].append(error_msg)
                logger.warning(f"⚠ {error_msg}")
                
        except Exception as e:
            verification_results['missing'] += 1
            error_msg = f"쿠폰 {coupon_id} → {issuer_email} 검증 중 오류: {e}"
            verification_results['errors'].append(error_msg)
            logger.error(f"✗ {error_msg}")
    
    return verification_results

def main():
    """메인 실행 함수"""
    logger.info("=== 임직원 쿠폰 매칭 추가 스크립트 시작 ===")
    
    # CSV 파일 경로
    csv_file_path = "임직원 쿠폰 매칭 추가_2508.csv"
    
    if not os.path.exists(csv_file_path):
        logger.error(f"CSV 파일을 찾을 수 없습니다: {csv_file_path}")
        logger.info("현재 디렉토리의 파일 목록:")
        for file in os.listdir('.'):
            if file.endswith('.csv'):
                logger.info(f"  - {file}")
        return False
    
    # 1. CSV 파일 읽기
    logger.info(f"CSV 파일 읽는 중: {csv_file_path}")
    mappings = read_csv_file(csv_file_path)
    
    if not mappings:
        logger.error("처리할 매칭 데이터가 없습니다.")
        return False
    
    # 2. 데이터베이스 연결 테스트
    logger.info("데이터베이스 연결 테스트 중...")
    db_test = issuer_db_service.test_connection()
    if db_test['status'] != 'success':
        logger.error(f"데이터베이스 연결 실패: {db_test.get('error', '알 수 없는 오류')}")
        return False
    
    logger.info(f"데이터베이스 연결 성공: {db_test['database_type']}")
    logger.info(f"현재 발급자 수: {db_test['issuer_count']}, 매칭 수: {db_test['mapping_count']}")
    
    # 3. 쿠폰 매칭 추가
    logger.info(f"{len(mappings)}개의 쿠폰 매칭을 데이터베이스에 추가 중...")
    results = add_coupon_mappings(mappings)
    
    # 4. 결과 출력
    logger.info("=== 처리 결과 ===")
    logger.info(f"성공: {results['success']}개")
    logger.info(f"실패: {results['failed']}개")
    logger.info(f"건너뜀: {results['skipped']}개")
    
    if results['errors']:
        logger.info("오류 목록:")
        for error in results['errors']:
            logger.error(f"  - {error}")
    
    # 5. 매칭 결과 검증
    if results['success'] > 0:
        logger.info("매칭 결과 검증 중...")
        verification = verify_mappings(mappings)
        
        logger.info("=== 검증 결과 ===")
        logger.info(f"확인됨: {verification['verified']}개")
        logger.info(f"누락됨: {verification['missing']}개")
        
        if verification['errors']:
            logger.info("검증 오류:")
            for error in verification['errors']:
                logger.warning(f"  - {error}")
    
    # 6. 최종 상태 확인
    final_test = issuer_db_service.test_connection()
    if final_test['status'] == 'success':
        logger.info(f"최종 발급자 수: {final_test['issuer_count']}, 매칭 수: {final_test['mapping_count']}")
    
    logger.info("=== 스크립트 완료 ===")
    return results['success'] > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
