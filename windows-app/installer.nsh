; NSIS Installer Script for RENACE Windows App
; This script runs custom actions during installation

!macro customInstall
  ; Register protocol handler
  WriteRegStr HKCR "renace" "" "URL:RENACE Protocol"
  WriteRegStr HKCR "renace" "URL Protocol" ""
  WriteRegStr HKCR "renace\\shell\\open\\command" "" '"$INSTDIR\\RENACE App.exe" "%1"'
  
  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\\RENACE App.lnk" "$INSTDIR\\RENACE App.exe" "" "$INSTDIR\\resources\\assets\\icon.ico" 0
!macroend

!macro customUnInstall
  ; Remove protocol handler
  DeleteRegKey HKCR "renace"
  
  ; Remove desktop shortcut
  Delete "$DESKTOP\\RENACE App.lnk"
!macroend
