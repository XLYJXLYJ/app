@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\_qrcode@1.2.2@qrcode\bin\qrcode" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\_qrcode@1.2.2@qrcode\bin\qrcode" %*
)