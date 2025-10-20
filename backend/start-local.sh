#!/bin/bash
# 로컬 개발 환경 실행 스크립트

set -euo pipefail

echo "🚀 로컬 개발 환경 시작..."

# PostgreSQL PATH 설정
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# 로컬 환경변수 로드 (주석, 공백 라인 무시)
while IFS='=' read -r key value; do
  if [[ -z "${key}" ]] || [[ "${key}" =~ ^# ]]; then
    continue
  fi
  export "${key}"="${value}"
done < local.env

# 기존 포트 점유 프로세스 종료
if lsof -ti:${PORT:-8000} >/dev/null 2>&1; then
  echo "⚠️ 포트 ${PORT:-8000} 점유 프로세스 종료"
  lsof -ti:${PORT:-8000} | xargs kill -9 || true
fi

# 백엔드 서버 시작
echo "📡 백엔드 서버 시작 (포트: ${PORT:-8000})..."
python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --reload
