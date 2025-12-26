#!/bin/sh
set -e

# Generate kong.yml from template using sed for substitution
echo "Generating /etc/kong/kong.yml from template..."

# We use | as delimiter for sed. Ensure JWT_SECRET does not contain |
sed "s|\${JWT_SECRET}|$JWT_SECRET|g" /etc/kong/kong.template.yml > /etc/kong/kong.yml

echo "Configuration generated. Starting Kong..."

# Start Kong using the docker-entrypoint.sh or direct command
# The official image creates the database if configured, but we are dbless.
# We just need to exec whatever command was passed, usually "kong docker-start"
exec /docker-entrypoint.sh "$@"
