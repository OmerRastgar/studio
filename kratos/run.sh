#!/bin/sh
set -e

# Generate kratos.yml from template using sed for substitution
# We use | as delimiter assuming it won't be present in the values.
# If values contain |, this will break.
echo "Generating /etc/config/kratos/kratos.yml from template..."

sed -e "s|\${DSN}|$DSN|g" \
    -e "s|\${GOOGLE_CLIENT_ID}|$GOOGLE_CLIENT_ID|g" \
    -e "s|\${GOOGLE_CLIENT_SECRET}|$GOOGLE_CLIENT_SECRET|g" \
    -e "s|\${PUBLIC_URL}|$PUBLIC_URL|g" \
    -e "s|\${COOKIE_DOMAIN}|$COOKIE_DOMAIN|g" \
    -e "s|\${SECRET_COOKIE}|${SECRET_COOKIE:-PLEASE_CHANGE_ME_IN_PROD_COOKIE_SECRET}|g" \
    -e "s|\${SECRET_DEFAULT}|${SECRET_DEFAULT:-PLEASE_CHANGE_ME_IN_PROD_DEFAULT_SECRET}|g" \
    /etc/config/kratos/kratos.template.yml > /tmp/kratos.yml

echo "Configuration generated. Starting Kratos..."

# Execute the passed command
exec kratos "$@"
