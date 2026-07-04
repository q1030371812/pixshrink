"""Reddit Hybrid Agent - Configuration"""
import re

# Target subreddits for monitoring
SUBREDDITS = [
    "webdev",
    "Photography",
    "selfhosted",
    "privacy",
    "macapps",
    "DataHoarder",
]

# Operational limits
LIMITS = {
    "max_posts_per_day_per_account": 2,
    "min_account_karma": 50,
    "domain_rotation": {
        # 70% posts include the primary domain, 30% use a permalink/discussion variant
        "primary_share": 0.7,
        "primary_domain": "pixshrink.com",
        # Alt text: "self post" or "discussion request" with no link
        "alt_share": 0.3,
    },
    "max_post_age_hours": 24,  # only engage with threads <24h old
    "cooldown_between_posts_minutes": 120,  # 2 hour cooldown per account
    "watchdog_karma_floor": -2,  # delete post if account karma < -2
}

# Triggers — threads matching these keywords are candidates
TRIGGER_KEYWORDS = re.compile(
    r"\b("
    r"compress|compresses|compressing|"
    r"image|images|photo|photos|picture|pictures|"
    r"reduce|smaller|shrink|optimi[sz]e|"
    r"jpeg|jpg|png|webp|avif|"
    r"file size|reduce size|lossless|lossy|"
    r"image editor|batch|bulk|cli|command line|"
    r"self[- ]?hosted|local|offline|privacy|"
    r"mac( apps?)?|apple|"
    r"backup|archive|storage|"
    r"photo storage|photo management"
    r")\b",
    re.IGNORECASE,
)

# Negative keywords — skip if thread mentions these (complaint / support / off-topic)
NEGATIVE_KEYWORDS = re.compile(
    r"\b("
    r"hate|sucks|garbage|scam|spam|"
    r"alternative to .* that (is|are) free|"
    r"legal|copyright|dmca|takedown|"
    r"bug report|broken|crash|crashing"
    r")\b",
    re.IGNORECASE,
)

# Required env vars (documented in .env.example)
REQUIRED_ENV = [
    "REDDIT_CLIENT_ID",
    "REDDIT_CLIENT_SECRET",
    "REDDIT_USER_AGENT",
    "SLACK_WEBHOOK_URL",
    "ANTHROPIC_API_KEY",
]
