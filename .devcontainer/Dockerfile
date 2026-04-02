ARG VARIANT="3.13-bookworm"
FROM mcr.microsoft.com/devcontainers/python:${VARIANT}

ARG DOCKER_COMPOSE_VERSION="v2.36.0"
ARG CONTAINER_TIMEZONE="Asia/Ho_Chi_Minh"

# Optional: install extra CLI tools commonly used in this repo.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		curl \
		iproute2 \
		iputils-ping \
		net-tools \
		tzdata \
	&& ln -snf /usr/share/zoneinfo/${CONTAINER_TIMEZONE} /etc/localtime \
	&& echo "${CONTAINER_TIMEZONE}" > /etc/timezone \
	&& rm -rf /var/lib/apt/lists/*

ENV TZ=${CONTAINER_TIMEZONE}

# Install Docker Compose v2 CLI plugin (docker compose).
RUN set -eux; \
	arch="$(dpkg --print-architecture)"; \
	case "${arch}" in \
		amd64) compose_arch="x86_64" ;; \
		arm64) compose_arch="aarch64" ;; \
		*) echo "Unsupported architecture: ${arch}"; exit 1 ;; \
	esac; \
	install -d /usr/local/lib/docker/cli-plugins; \
	curl -fsSL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-${compose_arch}" \
		-o /usr/local/lib/docker/cli-plugins/docker-compose; \
	chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
