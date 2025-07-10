import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseConfig:
    # 실제 데이터베이스 연결 정보
    HOST = os.getenv("DB_HOST", "butfitseoul-replica.cjilul7too7t.ap-northeast-2.rds.amazonaws.com")
    PORT = os.getenv("DB_PORT", "5432")
    NAME = os.getenv("DB_NAME", "master_20221217")
    USER = os.getenv("DB_USER", "syha")
    PASSWORD = os.getenv("DB_PASSWORD", "eteigeegha4Ungohteibahchohthoh6n")
    
    @classmethod
    def get_connection_string(cls):
        return f"postgresql://{cls.USER}:{cls.PASSWORD}@{cls.HOST}:{cls.PORT}/{cls.NAME}" 