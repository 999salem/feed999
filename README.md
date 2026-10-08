# 999 FEED — V4 Live Data

999 FEED is a personal Marvel leak-tracking dashboard powered by 999salem.

## V4 live feed
- Pulls public X timelines through the public FxTwitter API.
- Tracked handles: DanielRPK, ProjectHurts, MyTimeToShineH, Cryptic4KQual, AlexFromCC, CanWeGetToast, SpiderMan_Newz.
- Refreshes automatically every 90 seconds while the page is open.
- Filters posts into DOOMSDAY, SPIDER-MAN, X-MEN, MOVIES, and CASTING using keyword classification.
- Shows real public post text, timestamps, links, and available images.
- New posts appear behind the NEW LEAKS pill rather than interrupting the current scroll position.
- If the live endpoint is unavailable, the feed keeps the last successful data and clearly labels the connection state rather than inventing posts.

## Important
This is a browser-side live feed. The 90-second refresh runs while the page is open. GitHub Pages itself does not run a 90-second server job.

The feed uses the public FxTwitter/FxEmbed API and is subject to that service's availability and rate limits. No X credentials are stored in this project.
