# Dockerfile
FROM alpine:latest AS downloader

ARG PB_VERSION=0.28.4

RUN apk add --no-cache \
    unzip \
    ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Final stage - minimal runtime
FROM alpine:latest

RUN apk add --no-cache ca-certificates

# Copy csak a pocketbase binary-t
COPY --from=downloader /pb/pocketbase /pb/pocketbase

# Készítsünk könyvtárat az adatoknak
RUN mkdir -p /pb/pb_data

# PocketBase data volume
VOLUME ["/pb/pb_data"]

EXPOSE 8080

# Render.com esetén az adatok megőrzése érdekében
# Másoljuk be a lokális pb_data tartalmát (ha van)
COPY pb_data* /pb/pb_data/

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--origins=https://zengineer.cv,https://zengineer-frontend.onrender.com,http://localhost:3000,http://127.0.0.1:3000"]