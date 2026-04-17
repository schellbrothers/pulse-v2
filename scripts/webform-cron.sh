#!/bin/bash
# Web Form Sync Cron — runs every 5 min via local crontab
# Add to crontab: */5 * * * * /Users/schellie/.openclaw/workspace/pulse-v2/scripts/webform-cron.sh
curl -s "https://pulse-v2-nine.vercel.app/api/sync/webforms" >> /tmp/webform-sync.log 2>&1
echo "" >> /tmp/webform-sync.log
