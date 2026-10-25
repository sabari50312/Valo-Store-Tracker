#!/usr/bin/env bash
# Builds a release APK in Docker, so no Java or Android SDK is installed on this machine.
#
#   docker/build-apk.sh 1.0.1      build an arm64 APK as version 1.0.1
#   docker/build-apk.sh --remove   delete the image and all cached downloads
#
# The version must be higher than the one installed, or Android refuses the
# update (1.0.1 -> versionCode 10001, see app.config.js).
#
# Uses 4 CPU cores by default so the build fits in WSL's memory; set BUILD_CPUS to change it.
#
# The APK lands in dist/. It's signed with the release key from KEYS_DIR
# (release.p12 + secrets.env), so it installs over GitHub release builds.
# Without that folder it falls back to the debug key.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=valstore-android
VOLUMES=(valstore-sdk valstore-gradle valstore-npm)

if [[ "${1:-}" == "--remove" ]]; then
  docker rmi -f "$IMAGE" || true
  docker volume rm -f "${VOLUMES[@]}"
  exit
fi

VERSION="${1:?Pass the version to build, like 1.0.1}"
KEYS_DIR="${KEYS_DIR:-$PWD/../valorant-store-keys}"
signing=()
if [[ -f "$KEYS_DIR/release.p12" && -f "$KEYS_DIR/secrets.env" ]]; then
  signing=(-v "$KEYS_DIR:/keys:ro" --env-file "$KEYS_DIR/secrets.env" -e ANDROID_KEYSTORE_FILE=/keys/release.p12)
else
  echo "No keystore in $KEYS_DIR, signing with the debug key." >&2
fi

docker build -t "$IMAGE" docker
mkdir -p dist
docker run --rm "${signing[@]}" \
  --cpuset-cpus="0-$(( ${BUILD_CPUS:-4} - 1 ))" \
  -v "$PWD:/src:ro" \
  -v "$PWD/dist:/out" \
  -v valstore-sdk:/sdk \
  -v valstore-gradle:/root/.gradle \
  -v valstore-npm:/root/.npm \
  -e APP_VERSION="$VERSION" \
  -e HOST_UID="$(id -u)" \
  -e HOST_GID="$(id -g)" \
  "$IMAGE"
