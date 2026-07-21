on run
  set appPath to POSIX path of (path to me)
  set launcherPath to appPath & "Contents/Resources/launcher.zsh"
  do shell script "/bin/zsh " & quoted form of launcherPath & " </dev/null >/dev/null 2>&1 &"
end run
