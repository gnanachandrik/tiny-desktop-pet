#!/bin/bash
cd "$(dirname "$0")"
if [ ! -x "node_modules/.bin/electron" ]; then npm install || exit 1; fi
npm start
