#!/bin/bash
rm -rf www
mkdir www
cp *.html www/
cp -r css js images www/
echo "Frontend assets copied to www/"
