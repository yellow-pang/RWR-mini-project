# Stage 1: React 앱 빌드
# ※ build context는 프로젝트 루트(.)로 지정해야 nginx/nginx.conf에 접근 가능합니다.
FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ .

# Vite 빌드 시 환경변수 주입 (docker-compose.yml args에서 전달)
ARG VITE_KAKAO_MAP_KEY
ENV VITE_KAKAO_MAP_KEY=$VITE_KAKAO_MAP_KEY

RUN npm run build

# Stage 2: Nginx로 정적 파일 서빙 + /api 리버스 프록시
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
