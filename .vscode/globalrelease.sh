# build for web and desktop
pnpm build
7z a -tzip ./builds/web-build.zip ./dist/*
butler push builds/web-build.zip your_name_here/your_game_name_here:html5 --userversion 1.0