# Quick client smoke

from cse_lk import CSEClient

with CSEClient() as c:
    print("status", c.market_status())
    info = c.company_info("JKH.N0000")["reqSymbolInfo"]
    print("JKH", info["lastTradedPrice"], info["name"])
