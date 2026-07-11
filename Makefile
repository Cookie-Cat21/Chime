# Thin DX entrypoint for Chime local ops.
PYTHON ?= python3

.PHONY: help install lint typecheck test test-unit migrate up-db down-db up down factory-status factory-verify factory-scoreboard

help:
	@echo "Chime local targets:"
	@echo "  make install     Install package + dev deps"
	@echo "  make lint        Run ruff"
	@echo "  make typecheck   Run mypy"
	@echo "  make test        Run pytest (honors DATABASE_URL if set)"
	@echo "  make test-unit   Run pytest with DATABASE_URL cleared (CI unit parity)"
	@echo "  make up / up-db  Start local Postgres (docker compose --wait)"
	@echo "  make down / down-db  Stop local Postgres"
	@echo "  make migrate     Apply SQL migrations (waits for compose health)"
	@echo "  make factory-status  Agentic loop board + scoreboard"
	@echo "  make factory-verify  Canonical ruff/mypy/pytest proof"
	@echo "  make factory-scoreboard  Refresh SCOREBOARD.json from board DONE counts"

install:
	$(PYTHON) -m pip install -e ".[dev]"

lint:
	ruff check .

typecheck:
	mypy chime

test:
	pytest

test-unit:
	DATABASE_URL= pytest

migrate:
	@docker compose up -d --wait 2>/dev/null || true
	$(PYTHON) -m chime.migrate

up-db:
	docker compose up -d --wait

down-db:
	docker compose down

up: up-db

down: down-db

factory-status:
	$(PYTHON) scripts/factory/loop_status.py

factory-verify:
	bash scripts/factory/verify.sh

factory-scoreboard:
	$(PYTHON) scripts/factory/update_scoreboard.py --write
