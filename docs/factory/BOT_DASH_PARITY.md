# Bot / Dashboard Alert Parity

Chime remains Telegram-first. The dashboard is a thin management surface over
the same Postgres-backed watchlist, rules, and fire history.

| Alert type | Bot command | Dashboard create | Delivery surface | Notes |
|---|---:|---:|---|---|
| Price crosses above | Yes | Yes | Telegram | Same `price_above` rule. |
| Price crosses below | Yes | Yes | Telegram | Same `price_below` rule. |
| Daily % move | Yes | Yes | Telegram | One fire per Colombo trading day. |
| Disclosure / announcement | Yes | Yes | Telegram | Dashboard supports optional category filter. |
| Volume spike | Yes | Yes | Telegram | Uses persisted `price_snapshots.volume`. |
| Heavy volume + up | Yes | Yes | Telegram | Uses volume multiple plus positive move. |
| Heavy volume + down | Yes | Yes | Telegram | Uses volume multiple plus negative move. |
| Crossing volume | Yes | Yes | Telegram | Uses `price_snapshots.crossing_volume`. |
| Big print | Yes | Yes | Telegram | Uses day-tape `big_prints`. |
| Open gap | Yes | Yes | Telegram | One fire per Colombo trading day. |
| Buy-in board | Yes | Yes | Telegram | Notice-style rule, no threshold. |
| Non-compliance | Yes | Yes | Telegram | Notice-style rule, no threshold. |
| Market halt / notice | Yes | Yes | Telegram | Uses synthetic `MARKET` symbol. |
| Bid-heavy order book | Yes | Yes | Telegram | Uses public order-book totals. |
| Ask-heavy order book | Yes | Yes | Telegram | Uses public order-book totals. |
| EPS above / below | Bot only | Not yet | Telegram | Financial metrics feature-flagged. |
| EPS / revenue / profit YoY | Bot only | Not yet | Telegram | Financial metrics feature-flagged. |

## Dashboard-only operations

| Operation | Purpose | Notes |
|---|---|---|
| Alert quota | Abuse guard | `users.alert_quota_max` caps active dashboard alert creates. |
| Test fire | Audit-only dry run | Inserts `[dry-run]` `alert_log` row; no Telegram send. |
| Mute column | Temporary suppression | `alert_rules.muted_until` is read by the rule engine and skipped while future-dated. |
| User preferences | Future UX | `digest_enabled`, `quiet_hours_start`, and `quiet_hours_end` exist for later dashboard/bot preference wiring. |
