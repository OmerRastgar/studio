#!/bin/bash

echo "========================================"
echo "   Creating Deployment Package"
echo "========================================"

PACKAGE_NAME="audit-app-deployment-$(date +%Y%m%d-%H%M%S)"

echo ""
echo "Creating deployment package: $PACKAGE_NAME.tar.gz"

# Create temporary directory
mkdir -p /tmp/$PACKAGE_NAME

# Copy essential files
echo "Copying application files..."
cp -r src /tmp/$PACKAGE_NAME/
cp -r prisma /tmp/$PACKAGE_NAME/
cp -r public /tmp/$PACKAGE_NAME/ 2>/dev/null || echo "No public directory found"

# Copy configuration files
echo "Copying configuration files..."
cp package.json /tmp/$PACKAGE_NAME/
cp next.config.js /tmp/$PACKAGE_NAME/
cp docker-compose.yml /tmp/$PACKAGE_NAME/
cp Dockerfile.simple /tmp/$PACKAGE_NAME/
cp .env /tmp/$PACKAGE_NAME/
cp .dockerignore /tmp/$PACKAGE_NAME/

# Copy scripts
echo "Copying setup scripts..."
cp *.sh /tmp/$PACKAGE_NAME/

# Copy documentation
echo "Copying documentation..."
cp README.md /tmp/$PACKAGE_NAME/
cp DEPLOYMENT.md /tmp/$PACKAGE_NAME/

# Copy additional config files if they exist
cp kong.yml /tmp/$PACKAGE_NAME/ 2>/dev/null || echo "No kong.yml found"
cp fluent-bit.conf /tmp/$PACKAGE_NAME/ 2>/dev/null || echo "No fluent-bit.conf found"
cp parsers.conf /tmp/$PACKAGE_NAME/ 2>/dev/null || echo "No parsers.conf found"
cp loki-config.yml /tmp/$PACKAGE_NAME/ 2>/dev/null || echo "No loki-config.yml found"

# Create the package
echo "Creating compressed package..."
cd /tmp
tar -czf $PACKAGE_NAME.tar.gz $PACKAGE_NAME/

# Move to current directory
mv $PACKAGE_NAME.tar.gz $(pwd)/

# Cleanup
rm -rf /tmp/$PACKAGE_NAME

echo ""
echo "✅ Deployment package created: $PACKAGE_NAME.tar.gz"
echo ""
echo "Package contents:"
tar -tzf $PACKAGE_NAME.tar.gz | head -20
echo "... (and more)"
echo ""
echo "To deploy on target machine:"
echo "1. Transfer $PACKAGE_NAME.tar.gz to target machine"
echo "2. Extract: tar -xzf $PACKAGE_NAME.tar.gz"
echo "3. cd $PACKAGE_NAME"
echo "4. chmod +x *.sh"
echo "5. ./dev-setup.sh"
echo ""
echo "Package size: $(du -h $PACKAGE_NAME.tar.gz | cut -f1)"