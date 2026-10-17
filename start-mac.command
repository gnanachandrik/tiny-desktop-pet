#!/bin/bash
cd "$(dirname "$0")"
if [ ! -x "node_modules/.bin/electron" ]; then echo "First run: installing app dependencies..."; npm install || { echo "Install failed. Install Node.js LTS from https://nodejs.org/ and try again."; read -p "Press return to close"; exit 1; }; fi
npm start
