#!/usr/bin/env python3
"""
쿠폰 발행자 관리 CLI 도구

사용법:
python manage_issuers.py add "홍길동" "hong@company.com" "010-1234-5678" "마케팅팀"
python manage_issuers.py list
python manage_issuers.py info "홍길동"
python manage_issuers.py update "홍길동" --email "newemail@company.com"
python manage_issuers.py deactivate "홍길동"
"""

import sys
import argparse
from issuer_management import issuer_manager
import json

def add_issuer(name, email=None, phone=None, department=None, role="쿠폰발행자"):
    """새 발행자 추가"""
    print(f"발행자 등록 중: {name}")
    
    success = issuer_manager.add_issuer(
        name=name,
        email=email,
        phone=phone,
        department=department,
        role=role
    )
    
    if success:
        print(f"✅ 발행자 '{name}' 등록이 완료되었습니다.")
    else:
        print(f"❌ 발행자 등록에 실패했습니다. (이미 등록된 발행자일 수 있습니다)")

def list_issuers():
    """모든 발행자 목록 조회"""
    issuers = issuer_manager.get_all_issuers()
    
    if not issuers:
        print("등록된 발행자가 없습니다.")
        return
    
    print(f"\n📋 등록된 발행자 목록 ({len(issuers)}명)")
    print("-" * 80)
    print(f"{'이름':<15} {'이메일':<25} {'전화번호':<15} {'부서':<10} {'역할':<10}")
    print("-" * 80)
    
    for issuer in issuers:
        name = issuer.get('name', '')[:14]
        email = issuer.get('email', '-')[:24]
        phone = issuer.get('phone', '-')[:14]
        department = issuer.get('department', '-')[:9]
        role = issuer.get('role', '-')[:9]
        
        print(f"{name:<15} {email:<25} {phone:<15} {department:<10} {role:<10}")

def show_issuer_info(name):
    """특정 발행자 상세 정보 조회"""
    issuer = issuer_manager.get_issuer_by_name(name)
    
    if not issuer:
        print(f"❌ 발행자 '{name}'을 찾을 수 없습니다.")
        return
    
    print(f"\n👤 발행자 정보: {name}")
    print("-" * 50)
    print(f"ID: {issuer.get('id')}")
    print(f"이름: {issuer.get('name')}")
    print(f"이메일: {issuer.get('email', '미등록')}")
    print(f"전화번호: {issuer.get('phone', '미등록')}")
    print(f"부서: {issuer.get('department', '미등록')}")
    print(f"역할: {issuer.get('role', '미등록')}")
    print(f"활성 상태: {'활성' if issuer.get('is_active') else '비활성'}")
    print(f"등록일: {issuer.get('created_at', '미상')}")
    print(f"마지막 로그인: {issuer.get('last_login', '없음')}")
    print(f"로그인 횟수: {issuer.get('login_count', 0)}회")

def update_issuer(name, email=None, phone=None, department=None, role=None):
    """발행자 정보 업데이트"""
    update_data = {}
    if email:
        update_data['email'] = email
    if phone:
        update_data['phone'] = phone
    if department:
        update_data['department'] = department
    if role:
        update_data['role'] = role
    
    if not update_data:
        print("❌ 업데이트할 정보가 없습니다.")
        return
    
    print(f"발행자 정보 업데이트 중: {name}")
    print(f"업데이트 항목: {list(update_data.keys())}")
    
    success = issuer_manager.update_issuer(name, **update_data)
    
    if success:
        print(f"✅ 발행자 '{name}' 정보가 업데이트되었습니다.")
    else:
        print(f"❌ 발행자 정보 업데이트에 실패했습니다.")

def deactivate_issuer(name):
    """발행자 비활성화"""
    confirm = input(f"정말로 발행자 '{name}'을 비활성화하시겠습니까? (y/N): ")
    if confirm.lower() != 'y':
        print("취소되었습니다.")
        return
    
    success = issuer_manager.deactivate_issuer(name)
    
    if success:
        print(f"✅ 발행자 '{name}'이 비활성화되었습니다.")
    else:
        print(f"❌ 발행자 비활성화에 실패했습니다.")

def bulk_add_from_file(file_path):
    """파일에서 대량 발행자 등록"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'issuers' not in data:
            print("❌ 올바른 JSON 형식이 아닙니다. 'issuers' 키가 필요합니다.")
            return
        
        success_count = 0
        fail_count = 0
        
        for issuer_data in data['issuers']:
            try:
                success = issuer_manager.add_issuer(
                    name=issuer_data['name'],
                    email=issuer_data.get('email'),
                    phone=issuer_data.get('phone'),
                    department=issuer_data.get('department'),
                    role=issuer_data.get('role', '쿠폰발행자')
                )
                
                if success:
                    success_count += 1
                    print(f"✅ {issuer_data['name']} 등록 완료")
                else:
                    fail_count += 1
                    print(f"❌ {issuer_data['name']} 등록 실패")
                    
            except Exception as e:
                fail_count += 1
                print(f"❌ {issuer_data.get('name', '알 수 없음')} 등록 실패: {e}")
        
        print(f"\n📊 결과: 성공 {success_count}명, 실패 {fail_count}명")
        
    except Exception as e:
        print(f"❌ 파일 처리 중 오류 발생: {e}")

def main():
    parser = argparse.ArgumentParser(description='쿠폰 발행자 관리 도구')
    subparsers = parser.add_subparsers(dest='command', help='사용 가능한 명령어')
    
    # add 명령어
    add_parser = subparsers.add_parser('add', help='새 발행자 추가')
    add_parser.add_argument('name', help='발행자 이름')
    add_parser.add_argument('email', nargs='?', help='이메일 주소')
    add_parser.add_argument('phone', nargs='?', help='전화번호')
    add_parser.add_argument('department', nargs='?', help='부서명')
    add_parser.add_argument('--role', default='쿠폰발행자', help='역할')
    
    # list 명령어
    list_parser = subparsers.add_parser('list', help='모든 발행자 목록 조회')
    
    # info 명령어
    info_parser = subparsers.add_parser('info', help='특정 발행자 정보 조회')
    info_parser.add_argument('name', help='발행자 이름')
    
    # update 명령어
    update_parser = subparsers.add_parser('update', help='발행자 정보 업데이트')
    update_parser.add_argument('name', help='발행자 이름')
    update_parser.add_argument('--email', help='새 이메일 주소')
    update_parser.add_argument('--phone', help='새 전화번호')
    update_parser.add_argument('--department', help='새 부서명')
    update_parser.add_argument('--role', help='새 역할')
    
    # deactivate 명령어
    deactivate_parser = subparsers.add_parser('deactivate', help='발행자 비활성화')
    deactivate_parser.add_argument('name', help='발행자 이름')
    
    # bulk-add 명령어
    bulk_parser = subparsers.add_parser('bulk-add', help='JSON 파일에서 대량 등록')
    bulk_parser.add_argument('file', help='JSON 파일 경로')
    
    args = parser.parse_args()
    
    if args.command == 'add':
        add_issuer(args.name, args.email, args.phone, args.department, args.role)
    elif args.command == 'list':
        list_issuers()
    elif args.command == 'info':
        show_issuer_info(args.name)
    elif args.command == 'update':
        update_issuer(args.name, args.email, args.phone, args.department, args.role)
    elif args.command == 'deactivate':
        deactivate_issuer(args.name)
    elif args.command == 'bulk-add':
        bulk_add_from_file(args.file)
    else:
        parser.print_help()

if __name__ == '__main__':
    main() 