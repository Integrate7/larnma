# Makefile for Larnma
# ====================

APP_NAME := larnma
PORT := 3000
SONAR_TOKEN := squ_072762198d94bec7792fb6037628097471e2d098

GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

.PHONY: help install dev build start clean lint lint-fix test test-coverage e2e e2e-ui verify sonar-up sonar-down sonar-logs sonar-scan

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
	@echo "$(YELLOW)Quality gate:$(NC)"
	@echo "  make verify        Lint + type-check + unit tests with coverage"
	@echo ""
	@echo "$(YELLOW)SonarQube:$(NC)"
	@echo "  make sonar-up      Start local SonarQube (http://localhost:9090)"
	@echo "  make sonar-down    Stop local SonarQube"
	@echo "  make sonar-logs    Tail SonarQube logs"
	@echo "  make sonar-scan    Run coverage + SonarQube scan (SONAR_TOKEN=...)"

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

verify:
	npm run lint
	npm run test:coverage

sonar-up:
	docker compose -f docker-compose.sonarqube.yml up -d
	@echo ""
	@echo "$(GREEN)SonarQube is starting on http://localhost:9090$(NC)"
	@echo "First-run default login: admin / admin (you will be forced to change it)"
	@echo "Then: My Account → Security → generate a token and run:"
	@echo "  make sonar-scan SONAR_TOKEN=<your-token>"

sonar-down:
	docker compose -f docker-compose.sonarqube.yml down

sonar-logs:
	docker compose -f docker-compose.sonarqube.yml logs -f sonarqube

sonar-scan:
	@if [ -z "$(SONAR_TOKEN)" ]; then \
		echo "$(RED)SONAR_TOKEN is required. Usage: make sonar-scan SONAR_TOKEN=...$(NC)"; \
		exit 1; \
	fi
	npm run test:coverage
	npx -y sonarqube-scanner -Dsonar.token=$(SONAR_TOKEN)
