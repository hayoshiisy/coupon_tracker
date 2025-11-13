import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

def _get_required_env(key: str) -> str:
    """필수 환경 변수를 가져옵니다. 없으면 에러를 발생시킵니다."""
    value = os.getenv(key)
    if not value:
        error_msg = (
            f"필수 환경 변수 '{key}'가 설정되지 않았습니다. "
            f"환경 변수 파일(.env)을 확인하거나 시스템 환경 변수를 설정해주세요."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
    return value

def _get_env_with_default(key: str, default: str) -> str:
    """선택적 환경 변수를 가져옵니다. 없으면 기본값을 사용합니다."""
    return os.getenv(key, default)

class DatabaseConfig:
    """데이터베이스 연결 설정 - 모든 값은 환경 변수에서 가져옵니다."""
    
    # 실제 데이터베이스 연결 정보 - 환경 변수에서 필수로 가져옴
    # 하드코딩된 기본값 제거: 보안을 위해 환경 변수 필수
    HOST = _get_required_env("DB_HOST")
    PORT = _get_env_with_default("DB_PORT", "5432")
    NAME = _get_required_env("DB_NAME")
    USER = _get_required_env("DB_USER")
    PASSWORD = _get_required_env("DB_PASSWORD")
    
    @classmethod
    def get_connection_string(cls):
        """데이터베이스 연결 문자열을 반환합니다."""
        return f"postgresql://{cls.USER}:{cls.PASSWORD}@{cls.HOST}:{cls.PORT}/{cls.NAME}" 