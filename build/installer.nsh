; RENACE Portal — NSIS hooks
; - Cierra procesos abiertos UNA vez antes de instalar
; - Upgrade normal: electron-builder llama uninstallOldVersion (mismo appId/GUID)
;   con --updated → desinstala versión anterior SIN borrar userData/Odoo sessions
; - NUNCA re-ejecutar uninstall a mano sobre el mismo INSTDIR (doble install)
; - Orphans: solo limpia copias en OTRA carpeta (p.ej. restos per-user viejos)
; - Autostart: una sola clave HKCU Run "RENACE Portal"; borra duplicados y Startup .lnk
; - Silent (/S): no pregunta autostart; no relanza POS (lo hace Portal al abrir)
; Payload: resources/posagent y resources/vcredist

!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!macro RenaceCloseRunningApps
  DetailPrint "Cerrando RENACE Portal / POS Agent si estan abiertos..."
  ExecWait '"$SYSDIR\taskkill.exe" /F /T /IM "RENACE Portal.exe"' $R0
  ExecWait '"$SYSDIR\taskkill.exe" /F /T /IM "posagent.exe"' $R0
  ExecWait '"$SYSDIR\taskkill.exe" /F /T /IM "renace-tech.exe"' $R0
  ExecWait '"$SYSDIR\taskkill.exe" /F /T /IM "Electron.exe"' $R0
  Sleep 500
  ExecWait '"$SYSDIR\taskkill.exe" /F /T /IM "RENACE Portal.exe"' $R0
  Sleep 800
!macroend

; Quita TODO rastro de autostart duplicado (Run + Startup). No toca userData.
!macro RenaceScrubAutostartDupes
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "renace-tech"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal.exe"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Electron"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "tech.renace.portal.desktop"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.electron.renace-tech"
  ; Common Startup (all-users) por si alguna vez se instaló elevated
  SetShellVarContext all
  Delete "$SMSTARTUP\RENACE Portal.lnk"
  Delete "$SMSTARTUP\renace-tech.lnk"
  Delete "$SMSTARTUP\Electron.lnk"
  SetShellVarContext current
  Delete "$SMSTARTUP\RENACE Portal.lnk"
  Delete "$SMSTARTUP\renace-tech.lnk"
  Delete "$SMSTARTUP\Electron.lnk"
!macroend

!macro RenaceHasVcRedist
  StrCpy $R9 0
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
  ReadRegDWORD $R8 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $R8 == 1
    StrCpy $R9 1
  ${ElseIf} ${FileExists} "$SYSDIR\vcruntime140.dll"
    ${If} ${FileExists} "$SYSDIR\msvcp140.dll"
      StrCpy $R9 1
    ${EndIf}
  ${EndIf}
  SetRegView Default
!macroend

!macro customInit
  ; 1) Cerrar apps activas
  !insertmacro RenaceCloseRunningApps
  ; 2) Autostart basura ANTES de que electron-builder desinstale la versión registrada
  !insertmacro RenaceScrubAutostartDupes
!macroend

!macro customUnInit
  !insertmacro RenaceCloseRunningApps
!macroend

!macro customInstall
  DetailPrint "Comprobando Microsoft Visual C++ Redistributable (x64)..."
  !insertmacro RenaceHasVcRedist
  ${If} $R9 == 1
    DetailPrint "Visual C++ Redistributable (x64) ya presente."
  ${Else}
    StrCpy $0 "$INSTDIR\resources\vcredist\VC_redist.x64.exe"
    ${If} ${FileExists} "$0"
      DetailPrint "Instalando Visual C++ Redistributable..."
      ExecWait '"$0" /install /quiet /norestart' $1
      DetailPrint "VC++ codigo: $1"
      ${If} $1 == 0
      ${OrIf} $1 == 1638
      ${OrIf} $1 == 3010
        DetailPrint "Visual C++ listo."
      ${Else}
        ${IfNot} ${Silent}
          MessageBox MB_ICONEXCLAMATION|MB_OK "No se pudo instalar Visual C++ Redistributable (codigo $1)."
        ${EndIf}
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; Quitar accesos directos basura (icono Electron genérico de builds viejos)
  Delete "$DESKTOP\Electron.lnk"
  Delete "$SMPROGRAMS\Electron.lnk"
  Delete "$DESKTOP\renace-tech.lnk"
  Delete "$SMPROGRAMS\renace-tech.lnk"

  ; --- Inicio con Windows ---
  ; Un solo path: HKCU Run "RENACE Portal". Quitar duplicados de Electron / builds viejos.
  !insertmacro RenaceScrubAutostartDupes

  ${If} ${Silent}
    ReadRegStr $R7 HKCU "Software\RENACE\Portal" "StartWithWindows"
    ${If} $R7 == "0"
      DetailPrint "Silent: sin inicio automatico."
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
      StrCpy $R7 0
    ${Else}
      DetailPrint "Silent: preservando inicio con Windows."
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal" '"$INSTDIR\RENACE Portal.exe"'
      WriteRegStr HKCU "Software\RENACE\Portal" "StartWithWindows" "1"
      StrCpy $R7 1
    ${EndIf}
  ${Else}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON1 \
      "¿Iniciar RENACE Portal automáticamente con Windows?$\r$\n$\r$\nRecomendado en PCs de caja." \
      IDYES renace_autostart_yes IDNO renace_autostart_no

    renace_autostart_yes:
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal" '"$INSTDIR\RENACE Portal.exe"'
      WriteRegStr HKCU "Software\RENACE\Portal" "StartWithWindows" "1"
      StrCpy $R7 1
      Goto renace_autostart_done

    renace_autostart_no:
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
      WriteRegStr HKCU "Software\RENACE\Portal" "StartWithWindows" "0"
      StrCpy $R7 0

    renace_autostart_done:
  ${EndIf}

  StrCpy $0 "$INSTDIR\resources\posagent\posagent.exe"
  ${If} ${FileExists} "$0"
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentPath" "$0"
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentInstalled" "1"
    WriteRegStr HKCU "Software\RENACE\Portal" "VcRedistChecked" "1"
    ${If} $R7 == 1
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO" '"$0"'
    ${EndIf}
    ; Solo arrancar POS Agent en instalacion interactiva (no en update /S → evita doble proceso)
    ${IfNot} ${Silent}
      SetOutPath "$INSTDIR\resources\posagent"
      Exec '"$0"'
      DetailPrint "POS Agent iniciado."
    ${Else}
      DetailPrint "Silent: POS Agent no relanzado (Portal lo gestiona al abrir)."
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  !insertmacro RenaceCloseRunningApps
  !insertmacro RenaceScrubAutostartDupes
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
  Delete "$DESKTOP\Electron.lnk"
  Delete "$SMPROGRAMS\Electron.lnk"
  Delete "$DESKTOP\renace-tech.lnk"
  Delete "$SMPROGRAMS\renace-tech.lnk"
  Delete "$DESKTOP\RENACE Portal.lnk"
  Delete "$SMPROGRAMS\RENACE Portal.lnk"
  RMDir /r "$INSTDIR\resources\posagent"
  RMDir /r "$INSTDIR\resources\vcredist"
  RMDir /r "$INSTDIR\resources\updates"
  RMDir /r "$INSTDIR\resources"
  ; En upgrade (${isUpdated}) preservar Software\RENACE\Portal (autostart prefs, etc.)
  ${ifNot} ${isUpdated}
    DeleteRegKey HKCU "Software\RENACE\Portal"
    RMDir /r "$INSTDIR"
  ${endIf}
!macroend
