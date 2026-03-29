#!/bin/bash
set -e

echo "Building frontend assets for Android..."

# Validate required directories exist
for dir in css js images; do
  if [ ! -d "$dir" ]; then
    echo "ERROR: Required directory '$dir' not found. Aborting."
    exit 1
  fi
done

# Check for HTML files
if ! ls *.html 1>/dev/null 2>&1; then
  echo "ERROR: No HTML files found in root. Aborting."
  exit 1
fi

rm -rf www
mkdir www
cp *.html www/
cp -r css js images www/

echo "Frontend assets copied to www/ successfully."
