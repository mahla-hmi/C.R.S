#!/bin/bash
# Runs ONCE, the first time the data volume is empty. Creates the user the app logs in with:
# it can only touch its own database (not the whole server). Passwords: letters and digits only.
set -e
mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<JS
db = db.getSiblingDB('${MONGO_APP_DB}');
db.createUser({
  user: '${MONGO_APP_USER}',
  pwd: '${MONGO_APP_PASSWORD}',
  roles: [{ role: 'readWrite', db: '${MONGO_APP_DB}' }, { role: 'dbAdmin', db: '${MONGO_APP_DB}' }]   // dbAdmin: migrations create validators/indexes
});
JS
