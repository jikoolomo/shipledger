FROM node:24-alpine AS base
WORKDIR /app

RUN npm install -g pnpm@11.19.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
RUN pnpm web:build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "exec", "next", "start", "apps/web", "--port", "3000"]
