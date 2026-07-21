"""Point-in-time source and data-quality features for distributed research."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

from koel.domain import DailyBar
from koel.ml.dataset import Sample

RESEARCH_FEATURE_NAMES: tuple[str, ...] = (
    "source_is_cse",
    "cse_fraction_20",
    "cse_fraction_60",
    "days_since_cse_start",
    "recent_source_splice",
    "missing_open_fraction_20",
    "missing_hilo_fraction_20",
    "missing_volume_fraction_20",
    "flat_price_streak",
)


@dataclass(frozen=True, slots=True)
class ResearchBarMetadata:
    source: str
    features: tuple[float, ...]


def _window_fraction(prefix: list[int], *, end: int, width: int) -> float:
    start = max(0, end - width + 1)
    count = prefix[end + 1] - prefix[start]
    return count / (end - start + 1)


def build_research_bar_metadata(
    series: dict[str, list[DailyBar]],
    *,
    dataset: str,
) -> dict[tuple[str, date], ResearchBarMetadata]:
    """Precompute source/quality features using bars available by each date."""
    if dataset not in {"cse", "hybrid"}:
        raise ValueError("dataset must be 'cse' or 'hybrid'")
    out: dict[tuple[str, date], ResearchBarMetadata] = {}
    for raw_symbol, bars in series.items():
        symbol = raw_symbol.strip().upper()
        ordered = sorted(bars, key=lambda bar: bar.trade_date)
        sources = [
            "cse" if dataset == "cse" or bar.source_period == 5 else "yahoo"
            for bar in ordered
        ]
        cse_prefix = [0]
        missing_open_prefix = [0]
        missing_hilo_prefix = [0]
        missing_volume_prefix = [0]
        first_cse_index: int | None = None
        flat_streak = 0

        for index, (bar, source) in enumerate(zip(ordered, sources, strict=True)):
            if source == "cse" and first_cse_index is None:
                first_cse_index = index
            cse_prefix.append(cse_prefix[-1] + int(source == "cse"))
            missing_open_prefix.append(
                missing_open_prefix[-1]
                + int(bar.open is None or not math.isfinite(bar.open))
            )
            missing_hilo_prefix.append(
                missing_hilo_prefix[-1]
                + int(
                    bar.high is None
                    or bar.low is None
                    or not math.isfinite(bar.high)
                    or not math.isfinite(bar.low)
                )
            )
            missing_volume_prefix.append(
                missing_volume_prefix[-1]
                + int(
                    bar.volume is None
                    or not math.isfinite(bar.volume)
                    or bar.volume <= 0
                )
            )
            if index > 0 and bar.price == ordered[index - 1].price:
                flat_streak += 1
            else:
                flat_streak = 0

            if first_cse_index is not None and index >= first_cse_index:
                days_since_cse_start = min(
                    3650.0,
                    float(
                        (bar.trade_date - ordered[first_cse_index].trade_date).days
                    ),
                )
                recent_splice = float(index - first_cse_index < 20)
            else:
                days_since_cse_start = -1.0
                recent_splice = 0.0

            features = (
                float(source == "cse"),
                _window_fraction(cse_prefix, end=index, width=20),
                _window_fraction(cse_prefix, end=index, width=60),
                days_since_cse_start,
                recent_splice,
                _window_fraction(missing_open_prefix, end=index, width=20),
                _window_fraction(missing_hilo_prefix, end=index, width=20),
                _window_fraction(missing_volume_prefix, end=index, width=20),
                float(min(flat_streak, 60)),
            )
            out[(symbol, bar.trade_date)] = ResearchBarMetadata(
                source=source,
                features=features,
            )
    return out


def enrich_research_quality(
    samples: list[Sample],
    metadata: dict[tuple[str, date], ResearchBarMetadata],
) -> list[Sample]:
    """Append precomputed point-in-time metadata to sample vectors."""
    out: list[Sample] = []
    for sample in samples:
        meta = metadata.get((sample.symbol, sample.as_of))
        if meta is None:
            continue
        out.append(
            Sample(
                symbol=sample.symbol,
                as_of=sample.as_of,
                x=tuple(sample.x) + meta.features,
                y_ret=sample.y_ret,
                y_dir=sample.y_dir,
                horizon=sample.horizon,
                target_date=sample.target_date,
            )
        )
    return out


def sample_domain(
    sample: Sample,
    metadata: dict[tuple[str, date], ResearchBarMetadata],
) -> str | None:
    """Return a domain only when both decision and outcome bars share it."""
    if sample.target_date is None:
        return None
    start = metadata.get((sample.symbol, sample.as_of))
    target = metadata.get((sample.symbol, sample.target_date))
    if start is None or target is None or start.source != target.source:
        return None
    return start.source
