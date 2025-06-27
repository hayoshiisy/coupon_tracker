import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:
    # 데이터베이스 연결 정보 - 실제 값으로 변경해주세요
    HOST = os.getenv("DB_HOST", "localhost")
    PORT = os.getenv("DB_PORT", "5432")
    NAME = os.getenv("DB_NAME", "your_database_name")
    USER = os.getenv("DB_USER", "your_username")
    PASSWORD = os.getenv("DB_PASSWORD", "your_password")
    
    @classmethod
    def get_connection_string(cls):
        return f"postgresql://{cls.USER}:{cls.PASSWORD}@{cls.HOST}:{cls.PORT}/{cls.NAME}" 