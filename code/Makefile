SHELL := /bin/bash

# Savoury — convenience targets for the three components.
# Usage: make -C code <target>   (from the repository root)

.PHONY: all install backend-install web-install mobile-install \
        backend-dev web-dev mobile-dev build backend-build web-build test

all: build

install: backend-install web-install mobile-install

backend-install:
	cd backend-api && npm install

web-install:
	cd web && npm install

mobile-install:
	cd mobile && npm install

backend-dev:
	cd backend-api && npm run dev

web-dev:
	cd web && npm run dev

mobile-dev:
	cd mobile && npx expo start

build: backend-build web-build

backend-build:
	cd backend-api && npx prisma generate && npm run build

web-build:
	cd web && npm run build

test:
	cd backend-api && npm test
