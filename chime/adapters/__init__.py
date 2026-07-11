"""Adapters for external data sources.

Each adapter isolates one upstream (cse.lk price endpoints, the announcements
feed) behind a clean interface, so a broken or changed endpoint is a one-file
fix, not a rewrite. Every failed upstream call must be logged.
"""
