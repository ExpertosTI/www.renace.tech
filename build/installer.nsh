; RENACE Portal — NSIS hooks
; - Cierra procesos abiertos UNA vez antes de instalar
; - NO desinstala a mano en upgrades: electron-builder ya gestiona el GUID
;   (evitar “instalar dos veces la misma instancia”)
; - Silent (/S): no pregunta autostart; no relanza POS (lo hace Portal al abrir)
; Payload: resources/posagent y resources/vcredist

!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

!macro RenaceCloseRunningApps
  DetailPrint "Cerrando RENACE Portal / POS Agent si estan abiertos..."
  ExecWait 'taskkill /F /IM "RENACE Portal.exe" /T' $R0
  ExecWait 'taskkill /F /IM "posagent.exe" /T' $R0
  Sleep 800
!macroend

; Solo para restos huérfanos (otra carpeta), NUNCA en customInit de upgrade normal
!macro RenaceUninstallOrphan
  StrCpy $R1 "$LOCALAPPDATA\Programs\RENACE Portal\Uninstall RENACE Portal.exe"
  ${If} ${FileExists} "$R1"
    ; Si el uninstall apunta al mismo INSTDIR, electron-builder ya lo gestiona — no tocar
    ${If} "$INSTDIR" == "$LOCALAPPDATA\Programs\RENACE Portal"
      DetailPrint "Upgrade in-place — omitiendo uninstall manual."
    ${Else}
      DetailPrint "Limpiando instalacion huerfana (per-user)..."
      ExecWait '"$R1" /S _?=$LOCALAPPDATA\Programs\RENACE Portal' $R0
      Sleep 1000
    ${EndIf}
  ${EndIf}
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
  ; Una sola pasada — no uninstall+reinstall duplicado
  !insertmacro RenaceCloseRunningApps
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

  ; --- Inicio con Windows ---
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
    ; Solo arrancar POS en instalacion interactiva (no en update /S → evita doble proceso)
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
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
  ${ifNot} ${isUpdated}
    DeleteRegKey HKCU "Software\RENACE\Portal"
  ${endIf}
!macroend
