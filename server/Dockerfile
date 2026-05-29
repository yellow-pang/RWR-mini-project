FROM node:20-alpine

WORKDIR /app

# 의존성 파일 먼저 복사 → Docker 레이어 캐시 최적화
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
