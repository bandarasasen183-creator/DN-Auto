The built APK goes here as `dn-auto.apk`.

It is not in version control — `.gitignore` excludes it, because a signed
binary does not belong in a git history and it would be re-downloaded on
every clone. Copy it in after `bubblewrap build`, commit nothing, and let
the deploy carry it:

    cp app-release-signed.apk public/app/dn-auto.apk

See APK.md.
