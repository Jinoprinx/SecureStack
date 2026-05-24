# ---------------------------------------------------------------------------
# SecureStack — Project Makefile
# Run `make <target>` from the repository root.
# ---------------------------------------------------------------------------

.PHONY: init plan apply destroy validate fmt test dashboard lint

## Initialise Terraform (downloads providers, configures backend)
init:
	terraform -chdir=infra init

## Preview infrastructure changes
plan:
	terraform -chdir=infra plan

## Apply infrastructure changes (auto-approved — use in CI/CD only)
apply:
	terraform -chdir=infra apply -auto-approve

## Tear down all infrastructure (auto-approved — DANGEROUS)
destroy:
	terraform -chdir=infra destroy -auto-approve

## Validate Terraform configuration syntax
validate:
	terraform -chdir=infra validate

## Format all Terraform files recursively
fmt:
	terraform -chdir=infra fmt -recursive

## Run Lambda unit tests with pytest
test:
	cd lambdas && python -m pytest ../tests/ -v

## Start the dashboard dev server
dashboard:
	cd dashboard && npm run dev

## Lint Terraform files with tflint
lint:
	cd infra && tflint --recursive
