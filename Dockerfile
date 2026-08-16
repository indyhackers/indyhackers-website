FROM alpine:3 as downloader


ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT
ARG TARGETVARIANT
ARG PB_VERSION

ENV BUILDX_ARCH="${TARGETOS:-linux}_${TARGETARCH:-amd64}${TARGETVARIANT}"

RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${BUILDX_ARCH}.zip \
    && unzip pocketbase_${PB_VERSION}_${BUILDX_ARCH}.zip \
    && chmod +x /pocketbase

# --------

# Node 22+ is required: the vite-ssg build pulls in a jsdom dependency
# (@exodus/bytes) that is ESM-only and cannot be require()'d on Node 21.
FROM node:24 as vue-builder

WORKDIR /app/ui

# Install deps first, from the lockfile, so this layer is cached across builds
# that only touch source. npm ci is lockfile-exact and fails if package.json and
# package-lock.json drift, unlike npm i.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# --------

FROM alpine:3
RUN apk update && apk upgrade && apk add ca-certificates tzdata && rm -rf /var/cache/apk/*

# Indiana observes US Eastern time incl. DST — named zone (not a fixed UTC
# offset) so the event-alerts weekly cron keeps firing at 8am local
# year-round without manual adjustment at DST changeovers.
ENV TZ=America/Indiana/Indianapolis

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

COPY public/images /pb_public/images
COPY public/favicon.ico /pb_public/.
COPY pb/hooks /pb_hooks
COPY pb/migrations /pb_migrations
COPY src/mocks/mocks.json /.

EXPOSE 8090

COPY --from=downloader /pocketbase /usr/local/bin/pocketbase
COPY --from=vue-builder /app/ui/dist /pb_public

ENTRYPOINT ["/usr/local/bin/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--publicDir=/pb_public", "--hooksDir=/pb_hooks"]