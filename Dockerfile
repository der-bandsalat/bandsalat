# syntax=docker/dockerfile:1.7

# ---------- Stage 1: dependencies & build ----------
FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=1

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		python3 build-essential ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& corepack enable \
	&& corepack prepare pnpm@11.1.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm build \
	&& pnpm prune --prod \
	&& rm -rf /app/.svelte-kit

# ---------- Stage 2: runtime ----------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
ENV BODY_SIZE_LIMIT=20M

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates tini \
	&& rm -rf /var/lib/apt/lists/* \
	&& mkdir -p /data /app \
	&& chown -R node:node /data /app

WORKDIR /app
USER node

COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/drizzle ./drizzle
COPY --chown=node:node --from=builder /app/src/lib/server/db ./src/lib/server/db

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>r.ok?0:process.exit(1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "build/index.js"]
