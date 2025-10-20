# Python 3.9 이미지 사용 (Ubuntu 기반으로 변경)
FROM ubuntu:20.04

# 환경 변수 설정
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 Python, PostgreSQL 개발 라이브러리 설치
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-dev \
    python3.9-distutils \
    python3-pip \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/python3.9 /usr/bin/python \
    && ln -s /usr/bin/python3.9 /usr/bin/python3

# Python 의존성 복사 및 설치
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir --upgrade pip
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# 백엔드 코드 복사
COPY backend/ ./backend/

# 환경 변수 설정
ENV PYTHONPATH=/app

# 포트 노출
EXPOSE $PORT

# 애플리케이션 시작
CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"] 