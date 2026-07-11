# Third-party open-source dependencies

Chime does **not** vendor upstream source trees into this repo. Runtime
dependencies come from PyPI (Python package) and npm (`web/`).

## Python (`pyproject.toml`)

| Package | License | Role |
|---|---|---|
| [httpx](https://github.com/encode/httpx) | BSD-3-Clause | HTTP client for cse.lk adapter |
| [tenacity](https://github.com/jd/tenacity) | Apache-2.0 | Retries / backoff on flaky upstream calls |
| [pydantic](https://github.com/pydantic/pydantic) | MIT | Internal schemas / validation |
| [structlog](https://github.com/hynek/structlog) | MIT / Apache-2.0 | Structured logging |
| [APScheduler](https://github.com/agronholm/apscheduler) | MIT | Market-hours poller schedule |
| [python-telegram-bot](https://github.com/python-telegram-bot/python-telegram-bot) | LGPL-3.0 | Telegram bot |
| [psycopg](https://github.com/psycopg/psycopg) (v3) | LGPL-3.0 | Postgres driver |

Dev extras (`pytest`, `ruff`, `mypy`, etc.) are listed in `pyproject.toml`
`[project.optional-dependencies]` and follow their own upstream licenses.

A shorter copy also lives at repo-root [`THIRD_PARTY.md`](../THIRD_PARTY.md)
(kept for historical layout). Prefer this file for dashboard + bot together.

## Dashboard (`web/package.json`)

| Package | License | Role |
|---|---|---|
| [next](https://github.com/vercel/next.js) | MIT | App Router UI + Route Handlers |
| [react](https://github.com/facebook/react) / react-dom | MIT | UI |
| [tailwindcss](https://github.com/tailwindlabs/tailwindcss) | MIT | Styling |
| [pg](https://github.com/brianc/node-postgres) | MIT | Postgres client (no cse.lk from `web/`) |
| [shadcn/ui](https://ui.shadcn.com/) (copied components + CLI) | MIT | Button / Input / Label primitives |
| [radix-ui](https://www.radix-ui.com/) | MIT | Accessible primitives (via shadcn) |
| [class-variance-authority](https://github.com/joe-bell/cva) | Apache-2.0 | Variant helpers |
| [clsx](https://github.com/lukeed/clsx) / [tailwind-merge](https://github.com/dcastil/tailwind-merge) | MIT | className utilities |
| [lucide-react](https://github.com/lucide-icons/lucide) | ISC | Icons |

Exact versions: see `web/package-lock.json`. ESLint / TypeScript tooling is
dev-only.

For usage notes and related bookmarks, see [RESOURCES.md](RESOURCES.md).
