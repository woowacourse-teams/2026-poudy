#!/usr/bin/env bash

set -Eeuo pipefail

chown poudy:poudy /opt/poudy/backend/app.jar
chmod 0640 /opt/poudy/backend/app.jar
chown root:poudy /opt/poudy/backend/schema.sql
chmod 0640 /opt/poudy/backend/schema.sql

"$(dirname "$0")/prepare-database.sh"
