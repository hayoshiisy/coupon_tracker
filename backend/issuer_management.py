import json
import os
import hashlib
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class IssuerManager:
    """쿠폰 발행자 정보 관리 클래스"""
    
    def __init__(self, data_file: str = "issuers.json"):
        self.data_file = os.path.join(os.path.dirname(__file__), data_file)
        self.issuers = self._load_issuers()
    
    def _load_issuers(self) -> Dict:
        """발행자 정보 파일 로드"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # 초기 데이터 생성
                initial_data = {
                    "issuers": {},
                    "last_updated": datetime.now().isoformat()
                }
                self._save_issuers(initial_data)
                return initial_data
        except Exception as e:
            logger.error(f"발행자 정보 로드 실패: {e}")
            return {"issuers": {}, "last_updated": datetime.now().isoformat()}
    
    def _save_issuers(self, data: Dict):
        """발행자 정보 파일 저장"""
        try:
            data["last_updated"] = datetime.now().isoformat()
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"발행자 정보 저장 실패: {e}")
    
    def _generate_issuer_id(self, name: str, email: str = None, phone: str = None) -> str:
        """발행자 고유 ID 생성"""
        base_string = f"{name}_{email or ''}_{phone or ''}"
        return hashlib.sha256(base_string.encode()).hexdigest()[:16]
    
    def add_issuer(self, name: str, email: str = None, phone: str = None, 
                   department: str = None, role: str = "쿠폰발행자") -> bool:
        """새 발행자 추가"""
        try:
            issuer_id = self._generate_issuer_id(name, email, phone)
            
            # 중복 확인
            if self.get_issuer_by_name(name):
                logger.warning(f"이미 등록된 발행자입니다: {name}")
                return False
            
            issuer_data = {
                "id": issuer_id,
                "name": name,
                "email": email,
                "phone": phone,
                "department": department,
                "role": role,
                "is_active": True,
                "created_at": datetime.now().isoformat(),
                "last_login": None,
                "login_count": 0
            }
            
            self.issuers["issuers"][issuer_id] = issuer_data
            self._save_issuers(self.issuers)
            
            logger.info(f"새 발행자 등록 완료: {name} (ID: {issuer_id})")
            return True
            
        except Exception as e:
            logger.error(f"발행자 추가 실패: {e}")
            return False
    
    def get_issuer_by_name(self, name: str) -> Optional[Dict]:
        """이름으로 발행자 정보 조회"""
        for issuer_id, issuer_data in self.issuers["issuers"].items():
            if issuer_data["name"] == name and issuer_data["is_active"]:
                return issuer_data
        return None
    
    def get_issuer_by_contact(self, email: str = None, phone: str = None) -> Optional[Dict]:
        """이메일 또는 전화번호로 발행자 정보 조회"""
        for issuer_id, issuer_data in self.issuers["issuers"].items():
            if not issuer_data["is_active"]:
                continue
            
            if email and issuer_data.get("email") == email:
                return issuer_data
            if phone and issuer_data.get("phone") == phone:
                return issuer_data
        return None
    
    def authenticate_issuer(self, name: str, email: str = None, phone: str = None) -> Optional[Dict]:
        """발행자 인증"""
        try:
            # 이름으로 먼저 조회
            issuer = self.get_issuer_by_name(name)
            if not issuer:
                logger.warning(f"등록되지 않은 발행자: {name}")
                return None
            
            # 이메일 또는 전화번호 확인 (선택사항)
            if email and issuer.get("email") and issuer["email"] != email:
                logger.warning(f"이메일 불일치: {name}")
                return None
            
            if phone and issuer.get("phone") and issuer["phone"] != phone:
                logger.warning(f"전화번호 불일치: {name}")
                return None
            
            # 로그인 정보 업데이트
            issuer["last_login"] = datetime.now().isoformat()
            issuer["login_count"] = issuer.get("login_count", 0) + 1
            
            # 발행자 정보 저장
            issuer_id = issuer["id"]
            self.issuers["issuers"][issuer_id] = issuer
            self._save_issuers(self.issuers)
            
            logger.info(f"발행자 인증 성공: {name}")
            return issuer
            
        except Exception as e:
            logger.error(f"발행자 인증 실패: {e}")
            return None
    
    def get_all_issuers(self) -> List[Dict]:
        """모든 발행자 목록 조회"""
        return [
            issuer for issuer in self.issuers["issuers"].values() 
            if issuer["is_active"]
        ]
    
    def update_issuer(self, name: str, **kwargs) -> bool:
        """발행자 정보 업데이트"""
        try:
            issuer = self.get_issuer_by_name(name)
            if not issuer:
                return False
            
            # 업데이트 가능한 필드들
            updatable_fields = ["email", "phone", "department", "role"]
            
            for field, value in kwargs.items():
                if field in updatable_fields:
                    issuer[field] = value
            
            issuer["updated_at"] = datetime.now().isoformat()
            
            # 저장
            issuer_id = issuer["id"]
            self.issuers["issuers"][issuer_id] = issuer
            self._save_issuers(self.issuers)
            
            logger.info(f"발행자 정보 업데이트 완료: {name}")
            return True
            
        except Exception as e:
            logger.error(f"발행자 정보 업데이트 실패: {e}")
            return False
    
    def deactivate_issuer(self, name: str) -> bool:
        """발행자 비활성화"""
        try:
            issuer = self.get_issuer_by_name(name)
            if not issuer:
                return False
            
            issuer["is_active"] = False
            issuer["deactivated_at"] = datetime.now().isoformat()
            
            issuer_id = issuer["id"]
            self.issuers["issuers"][issuer_id] = issuer
            self._save_issuers(self.issuers)
            
            logger.info(f"발행자 비활성화 완료: {name}")
            return True
            
        except Exception as e:
            logger.error(f"발행자 비활성화 실패: {e}")
            return False

# 전역 발행자 관리자 인스턴스
issuer_manager = IssuerManager() 