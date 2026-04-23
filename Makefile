# Makefile for Larnma
# ====================

APP_NAME := larnma
PORT := 3000

GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

.PHONY: help install dev build start clean lint lint-fix test test-coverage e2e e2e-ui sonar-up sonar-down sonar-scan

help:
	@echo "$(GREEN)Larnma — Available Commands$(NC)"
	@echo "================================================"
	@echo ""
	@echo "$(YELLOW)Development:$(NC)"
	@echo "  make install       Install dependencies"
	@echo "  make dev           Start dev server (port $(PORT))"
	@echo "  make build         Build production bundle"
	@echo "  make start         Start production server"
	@echo "  make clean         Remove build artifacts and node_modules"
	@echo ""
	@echo "$(YELLOW)Quality:$(NC)"
	@echo "  make lint          Run Biome + tsc"
	@echo "  make lint-fix      Auto-fix Biome issues"
	@echo "  make test          Run unit tests"
	@echo "  make test-coverage Run unit tests with coverage"
	@echo "  make e2e           Run Playwright E2E tests"
	@echo "  make e2e-ui        Run Playwright in UI mode"
	@echo ""
	@echo "$(YELLOW)SonarQube:$(NC)"
	@echo "  make sonar-up      Start local SonarQube"
	@echo "  make sonar-down    Stop local SonarQube"
	@echo "  make sonar-scan    Run SonarQube scan"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

clean:
	rm -rf .next node_modules tsconfig.tsbuildinfo coverage test-results e2e/playwright-report e2e/test-results

lint:
	npm run lint

lint-fix:
	npm run lint:fix

test:
	npm run test

test-coverage:
	npm run test:coverage

e2e:
	npm run test:e2e

e2e-ui:
	npm run test:e2e:ui

sonar-up:
	docker compose -f docker-compose.sonarqube.yml up -d

sonar-down:
	docker compose -f docker-compose.sonarqube.yml down

sonar-scan:
	@if [ -z "$(SONAR_TOKEN)" ]; then \
		echo "$(RED)SONAR_TOKEN is required. Usage: make sonar-scan SONAR_TOKEN=...$(NC)"; \
		exit 1; \
	fi
	npm run test:coverage
	npx sonar-scanner -Dsonar.token=$(SONAR_TOKEN)
