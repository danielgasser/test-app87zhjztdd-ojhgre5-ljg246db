#!/bin/bash
cd /home/expo/workingdir/build
VERSION_NAME=$(node -e "const c=require('./app.config.js')(); console.log(c.expo.version)")
VERSION_CODE=$(node -e "const c=require('./app.config.js')(); console.log(c.expo.android.versionCode)")

node_modules/@bugsnag/cli/bin/bugsnag-cli upload react-native-android \
  --api-key=$EXPO_PUBLIC_BUGSNAG_API_KEY \
  --version-name=$VERSION_NAME \
  --version-code=$VERSION_CODE \
  --project-root=/home/expo/workingdir/build \
  /home/expo/workingdir/build