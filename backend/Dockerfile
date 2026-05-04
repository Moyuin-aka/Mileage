FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
ARG NPM_PROXY=
RUN if [ -n "$NPM_PROXY" ]; then \
      npm config set proxy "$NPM_PROXY" && \
      npm config set https-proxy "$NPM_PROXY"; \
    fi && \
    npm ci --no-audit --no-fund --fetch-retries=5 --fetch-timeout=120000

FROM node:22-bookworm-slim AS python-deps
WORKDIR /app
ARG NPM_PROXY=
COPY requirements.txt ./
RUN if [ -n "$NPM_PROXY" ]; then \
      printf 'Acquire::http::Proxy "%s";\nAcquire::https::Proxy "%s";\n' "$NPM_PROXY" "$NPM_PROXY" \
        > /etc/apt/apt.conf.d/99proxy; \
    fi && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-venv python3-socks ca-certificates libgomp1 && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/apt/apt.conf.d/99proxy && \
    python3 -m venv --system-site-packages /opt/venv && \
    ALL_PROXY="$NPM_PROXY" /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    ALL_PROXY="$NPM_PROXY" /opt/venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /opt/venv/bin/pip uninstall -y opencv-python || true && \
    ALL_PROXY="$NPM_PROXY" /opt/venv/bin/pip install --no-cache-dir opencv-python-headless pysocks && \
    ALL_PROXY="$NPM_PROXY" /opt/venv/bin/python -c "from rapidocr import RapidOCR; RapidOCR()"

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    OCR_PYTHON_BIN=/opt/venv/bin/python \
    PATH=/opt/venv/bin:$PATH
ARG NPM_PROXY=
RUN if [ -n "$NPM_PROXY" ]; then \
      printf 'Acquire::http::Proxy "%s";\nAcquire::https::Proxy "%s";\n' "$NPM_PROXY" "$NPM_PROXY" \
        > /etc/apt/apt.conf.d/99proxy; \
    fi && \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 ca-certificates libgomp1 && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/apt/apt.conf.d/99proxy
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=python-deps /opt/venv /opt/venv
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY ocr ./ocr
EXPOSE 8080
CMD ["npm", "run", "start"]
