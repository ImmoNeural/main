# ---- Build stage ----
FROM node:20-slim AS builder
WORKDIR /app

# better-sqlite3 é um módulo nativo: precisa de ferramentas de compilação
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências primeiro (melhor cache de camadas)
COPY package.json ./
RUN npm install

# Copia o código e compila (tsc -> dist/)
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia dependências já compiladas e o código transpilado do estágio de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# A app usa process.env.PORT (Northflank/Render injetam a porta automaticamente)
EXPOSE 3001
CMD ["node", "dist/index.js"]
