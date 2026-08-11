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
  ExecWait 'taskkill /F /IM "RENACE Portal.exe" /T' $R0
  ExecWait 'taskkill /F /IM "posagent.exe" /T' $R0
  ExecWait 'taskkill /F /IM "renace-tech.exe" /T' $R0
  ExecWait 'taskkill /F /IM "Electron.exe" /T' $R0
  ; Segunda pasada por si el proceso se resistió
  Sleep 800
  ExecWait 'taskkill /F /IM "RENACE Portal.exe" /T' $R0
  Sleep 2500
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

; Ejecuta uninstall silencioso de una ruta distinta a $INSTDIR (orphan)
!macro RenaceRunOrphanUninstall UNEXE INSTPATH
  ${If} ${FileExists} "${UNEXE}"
    ${If} "${INSTPATH}" == "$INSTDIR"
      DetailPrint "Misma carpeta que upgrade — omitiendo uninstall manual (lo hace electron-builder)."
    ${Else}
      DetailPrint "Desinstalando copia anterior huerfana: ${INSTPATH}"
      ; /KEEP_APP_DATA + --updated: no borra userData ni sesiones Odoo
      ExecWait '"${UNEXE}" /S /KEEP_APP_DATA --updated _?=${INSTPATH}' $R0
      Sleep 1000
      ; Si el uninstaller dejó restos, forzar borrado de esa carpeta (nunca $INSTDIR)
      ${If} ${FileExists} "${INSTPATH}"
        DetailPrint "Eliminando restos de carpeta huerfana: ${INSTPATH}"
        RMDir /r "${INSTPATH}"
      ${EndIf}
    ${EndIf}
  ${ElseIf} ${FileExists} "${INSTPATH}\RENACE Portal.exe"
    ; Carpeta huerfana sin uninstaller — solo si no es INSTDIR
    ${If} "${INSTPATH}" != "$INSTDIR"
      DetailPrint "Borrando install huerfana sin uninstaller: ${INSTPATH}"
      RMDir /r "${INSTPATH}"
    ${EndIf}
  ${EndIf}
!macroend

; Solo restos huérfanos (otra carpeta). NUNCA mismo INSTDIR.
!macro RenaceUninstallOrphan
  ; Per-user típico electron-builder oneClick
  StrCpy $R1 "$LOCALAPPDATA\Programs\RENACE Portal\Uninstall RENACE Portal.exe"
  StrCpy $R2 "$LOCALAPPDATA\Programs\RENACE Portal"
  !insertmacro RenaceRunOrphanUninstall "$R1" "$R2"

  ; Nombre package.json antiguo / variante
  StrCpy $R1 "$LOCALAPPDATA\Programs\renace-tech\Uninstall renace-tech.exe"
  StrCpy $R2 "$LOCALAPPDATA\Programs\renace-tech"
  !insertmacro RenaceRunOrphanUninstall "$R1" "$R2"

  ; Variante Program Files (si alguna vez se instaló elevated / all-users)
  StrCpy $R1 "$PROGRAMFILES\RENACE Portal\Uninstall RENACE Portal.exe"
  StrCpy $R2 "$PROGRAMFILES\RENACE Portal"
  !insertmacro RenaceRunOrphanUninstall "$R1" "$R2"

  ${If} ${RunningX64}
    StrCpy $R1 "$PROGRAMFILES64\RENACE Portal\Uninstall RENACE Portal.exe"
    StrCpy $R2 "$PROGRAMFILES64\RENACE Portal"
    !insertmacro RenaceRunOrphanUninstall "$R1" "$R2"

    StrCpy $R1 "$PROGRAMFILES64\renace-tech\Uninstall renace-tech.exe"
    StrCpy $R2 "$PROGRAMFILES64\renace-tech"
    !insertmacro RenaceRunOrphanUninstall "$R1" "$R2"
  ${EndIf}

  StrCpy $R1 "$PROGRAMFILES\renace-tech\Uninstall renace-tech.exe"
  StrCpy $R2 "$PROGRAMFILES\renace-tech"
  !insertmacro RenaceRunOrphanUninstall "$R1" "$R2"
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
  ; 1) Cerrar apps
  !insertmacro RenaceCloseRunningApps
  ; 2) Autostart basura ANTES de que electron-builder desinstale la versión registrada
  !insertmacro RenaceScrubAutostartDupes
  ; 3) Limpiar SOLO installs huerfanos en otra ruta
  ;    La versión registrada (mismo GUID/appId) la desinstala electron-builder
  ;    en installSection vía uninstallOldVersion + --updated (preserva AppData)
  !insertmacro RenaceUninstallOrphan
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
  !insertmacro RenaceScrubAutostartDupes
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
  Delete "$DESKTOP\Electron.lnk"
  Delete "$SMPROGRAMS\Electron.lnk"
  Delete "$DESKTOP\renace-tech.lnk"
  Delete "$SMPROGRAMS\renace-tech.lnk"
  ; En upgrade (${isUpdated}) preservar Software\RENACE\Portal (autostart prefs, etc.)
  ${ifNot} ${isUpdated}
    DeleteRegKey HKCU "Software\RENACE\Portal"
  ${endIf}
!macroend
