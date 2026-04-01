ARG VARIANT="3.13-bookworm"
FROM mcr.microsoft.com/devcontainers/python:${VARIANT}

# Optional: install extra CLI tools commonly used in this repo.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		iproute2 \
		iputils-ping \
		net-tools \
	&& rm -rf /var/lib/apt/lists/*
