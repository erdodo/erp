# Dodo Labs ERP — Next.js + Prisma imaji
FROM node:24-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund || npm install --ignore-scripts --no-audit --no-fund
COPY . .
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
ENV DATABASE_URL=$DATABASE_URL
RUN npx next build
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["sh","-c","if [ -d prisma/migrations ]; then npx prisma migrate deploy; fi; exec npx next start -p 3000 -H 0.0.0.0"]
