import os
from dotenv import load_dotenv

load_dotenv()

class IssuerDatabaseConfig:
    """쿠폰 발행자 관리를 위한 별도 데이터베이스 설정"""
    
    # 별도 데이터베이스 연결 정보
    HOST = os.getenv("ISSUER_DB_HOST", "localhost")
    PORT = os.getenv("ISSUER_DB_PORT", "5432")
    NAME = os.getenv("ISSUER_DB_NAME", "coupon_issuer_db")
    USER = os.getenv("ISSUER_DB_USER", "issuer_user")
    PASSWORD = os.getenv("ISSUER_DB_PASSWORD", "issuer_password")
    
    @classmethod
    def get_connection_string(cls):
        return f"postgresql://{cls.USER}:{cls.PASSWORD}@{cls.HOST}:{cls.PORT}/{cls.NAME}"
    
    @classmethod
    def get_connection_params(cls):
        return {
            'host': cls.HOST,
            'port': cls.PORT,
            'database': cls.NAME,
            'user': cls.USER,
            'password': cls.PASSWORD
        }

# Railway 클라우드 DB 사용 시 설정
class CloudIssuerDatabaseConfig:
    """Railway 등 클라우드 서비스를 위한 발행자 DB 설정"""
    
    # Railway PostgreSQL 연결 URL 형식
    DATABASE_URL = os.getenv("ISSUER_DATABASE_URL", "")
    
    @classmethod
    def get_connection_string(cls):
        return cls.DATABASE_URL
    
    @classmethod
    def parse_database_url(cls):
        """DATABASE_URL을 파싱하여 연결 정보 반환"""
        import urllib.parse
        
        if not cls.DATABASE_URL:
            raise ValueError("ISSUER_DATABASE_URL이 설정되지 않았습니다.")
        
        parsed = urllib.parse.urlparse(cls.DATABASE_URL)
        
        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path[1:],  # '/' 제거
            'user': parsed.username,
            'password': parsed.password
        }

# 사용할 설정 선택
USE_CLOUD_DB = os.getenv("USE_CLOUD_ISSUER_DB", "false").lower() == "true"

if USE_CLOUD_DB:
    ISSUER_DB_CONFIG = CloudIssuerDatabaseConfig
else:
    ISSUER_DB_CONFIG = IssuerDatabaseConfig 