.PHONY: test test-local test-docker test-coverage test-unit help

# Run tests inside the running backend container
test:
	docker compose exec backend pytest tests/ -v

# Run tests locally (outside Docker)
test-local:
	cd backend && pytest tests/ -v

# Run tests with Docker test profile (dedicated container)
test-docker:
	docker compose --profile test up backend-test --abort-on-container-exit

# Run tests with coverage
test-coverage:
	docker compose exec backend pytest tests/ -v --cov=app --cov-report=term-missing

# Run only unit tests (core algorithms)
test-unit:
	docker compose exec backend pytest tests/test_nested_set.py tests/test_merkle.py tests/test_permissions.py -v

# Run bug fix verification tests
test-fixes:
	docker compose exec backend pytest tests/test_bug_fixes.py -v

help:
	@echo "Available targets:"
	@echo "  test          - Run tests in backend container"
	@echo "  test-local   - Run tests locally"
	@echo "  test-docker  - Run with Docker test profile"
	@echo "  test-coverage - Run with coverage"
	@echo "  test-unit     - Run unit tests only"
	@echo "  test-fixes   - Run bug fix verification"
	@echo ""
	@echo "Usage: make [target]"
