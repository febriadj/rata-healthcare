FROM node:24-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate && pnpm build

EXPOSE 3001

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start:prod"]
