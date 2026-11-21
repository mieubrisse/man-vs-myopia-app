# One entry point for agents, the pre-push hook and CI. CI's required `check`
# job runs `make check`, so passing it locally means passing it there.

APP_DIRPATH := app
# npm ci rewrites this file, so dependencies reinstall only when the lockfile changes.
NODE_MODULES_STAMP_FILEPATH := $(APP_DIRPATH)/node_modules/.package-lock.json

.PHONY: setup hooks check test build

setup: $(NODE_MODULES_STAMP_FILEPATH) hooks

$(NODE_MODULES_STAMP_FILEPATH): $(APP_DIRPATH)/package-lock.json
	npm --prefix $(APP_DIRPATH) ci

# A relative hooksPath resolves against whichever worktree runs the hook.
hooks:
	git config core.hooksPath .githooks

check: setup
	npm --prefix $(APP_DIRPATH) run check-format
	npm --prefix $(APP_DIRPATH) run lint
	npm --prefix $(APP_DIRPATH) test
	npm --prefix $(APP_DIRPATH) run build

test: setup
	npm --prefix $(APP_DIRPATH) test

build: setup
	npm --prefix $(APP_DIRPATH) run build
