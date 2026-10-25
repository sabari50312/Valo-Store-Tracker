# Runs inside the container. The repo is mounted read-only at /src, so the build
# happens on a copy and the host's node_modules and android/ are never touched.
set -euo pipefail

if [[ ! -d "$ANDROID_HOME/licenses" ]]; then
  # `yes` dies of SIGPIPE once sdkmanager stops reading; that's expected, not a failure.
  (yes || true) | "$CMDLINE_TOOLS/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses > /dev/null
fi

rsync -a --delete --exclude node_modules --exclude android --exclude ios --exclude dist --exclude .git /src/ /work/
cd /work
npm ci --prefer-offline --no-audit --no-fund
npx expo prebuild --platform android --no-install --clean

cd android
# WSL has ~8GB; at full parallelism Gradle, Kotlin and the C++ compiles get OOM-killed.
# Ninja's job count follows the container's CPU set (see build-apk.sh), Gradle's follows --max-workers.
./gradlew assembleRelease --no-daemon --max-workers=3 \
  -Dorg.gradle.jvmargs="-Xmx3g -XX:MaxMetaspaceSize=1g" \
  -Pkotlin.compiler.execution.strategy=in-process \
  -PreactNativeArchitectures=arm64-v8a

apk=/out/val-store.apk
cp app/build/outputs/apk/release/app-release.apk "$apk"
chown "$HOST_UID:$HOST_GID" /out "$apk"
echo "Built $apk"
