; RENACE Portal — NSIS hooks
; - Cierra instancias abiertas antes de instalar / desinstalar
; - Desinstala version anterior si queda Uninstall.exe
; - Silent (/S): no pregunta autostart; conserva preferencia existente
; Payload: resources/posagent y resources/vcredist

!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

; --- Cerrar Portal (+ posagent para liberar DLLs del bundle) ---
!macro RenaceCloseRunningApps
  DetailPrint "Cerrando RENACE Portal e instancias relacionadas..."
  ; /T = arbol de procesos; ignorar si no habia proceso
  ExecWait 'taskkill /F /IM "RENACE Portal.exe" /T' $R0
  ExecWait 'taskkill /F /IM "RENACE Portal.exe"' $R0
  ExecWait 'taskkill /F /IM "posagent.exe" /T' $R0
  Sleep 1200
  ExecWait 'taskkill /F /IM "RENACE Portal.exe" /T' $R0
  Sleep 600
!macroend

; --- Desinstalar copia anterior (per-user / per-machine) ---
!macro RenaceUninstallPrevious
  ; electron-builder ya gestiona upgrade por GUID; esto limpia leftovers
  StrCpy $R1 "$LOCALAPPDATA\Programs\RENACE Portal\Uninstall RENACE Portal.exe"
  ${If} ${FileExists} "$R1"
    DetailPrint "Desinstalando version anterior (per-user)..."
    ExecWait '"$R1" /S' $R0
    Sleep 1500
  ${EndIf}

  StrCpy $R1 "$PROGRAMFILES\RENACE Portal\Uninstall RENACE Portal.exe"
  ${If} ${FileExists} "$R1"
    DetailPrint "Desinstalando version anterior (Program Files)..."
    ExecWait '"$R1" /S' $R0
    Sleep 1500
  ${EndIf}

  ${If} ${RunningX64}
    StrCpy $R1 "$PROGRAMFILES64\RENACE Portal\Uninstall RENACE Portal.exe"
    ${If} ${FileExists} "$R1"
      DetailPrint "Desinstalando version anterior (Program Files x64)..."
      ExecWait '"$R1" /S' $R0
      Sleep 1500
    ${EndIf}
  ${EndIf}
!macroend

; Devuelve 1 en $R9 si VC++ 2015-2022 x64 esta instalado
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
  !insertmacro RenaceCloseRunningApps
  !insertmacro RenaceUninstallPrevious
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
      DetailPrint "Instalando Visual C++ Redistributable (requerido por POS Agent)..."
      ExecWait '"$0" /install /quiet /norestart' $1
      DetailPrint "VC++ Redistributable codigo de salida: $1"
      ${If} $1 == 0
      ${OrIf} $1 == 1638
      ${OrIf} $1 == 3010
        DetailPrint "Visual C++ Redistributable listo."
      ${Else}
        DetailPrint "AVISO: VC++ no se instalo (codigo $1). POS Agent puede fallar."
        ${IfNot} ${Silent}
          MessageBox MB_ICONEXCLAMATION|MB_OK "No se pudo instalar Visual C++ Redistributable (codigo $1).$\r$\n$\r$\nPOS Agent puede dar error al abrir. Ejecuta como administrador:$\r$\n$INSTDIR\resources\vcredist\VC_redist.x64.exe"
        ${EndIf}
      ${EndIf}
    ${Else}
      DetailPrint "AVISO: no esta empaquetado VC_redist.x64.exe"
      ${IfNot} ${Silent}
        MessageBox MB_ICONEXCLAMATION|MB_OK "Falta Visual C++ Redistributable en el instalador.$\r$\nPOS Agent (impresoras) puede no arrancar."
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; --- Inicio con Windows ---
  ; Silent (/S = update desde la app): NO preguntar; conservar preferencia
  ${If} ${Silent}
    ReadRegStr $R7 HKCU "Software\RENACE\Portal" "StartWithWindows"
    ${If} $R7 == "0"
      DetailPrint "Silent: manteniendo sin inicio automatico."
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
      StrCpy $R7 0
    ${Else}
      ; "" o "1" → activar (caja / update)
      DetailPrint "Silent: preservando/activando inicio con Windows."
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal" '"$INSTDIR\RENACE Portal.exe"'
      WriteRegStr HKCU "Software\RENACE\Portal" "StartWithWindows" "1"
      StrCpy $R7 1
    ${EndIf}
  ${Else}
    MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON1 \
      "¿Iniciar RENACE Portal automáticamente con Windows?$\r$\n$\r$\nRecomendado en PCs de caja. También iniciará POS Agent (impresoras)." \
      IDYES renace_autostart_yes IDNO renace_autostart_no

    renace_autostart_yes:
      DetailPrint "Activando inicio con Windows..."
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal" '"$INSTDIR\RENACE Portal.exe"'
      WriteRegStr HKCU "Software\RENACE\Portal" "StartWithWindows" "1"
      StrCpy $R7 1
      Goto renace_autostart_done

    renace_autostart_no:
      DetailPrint "Inicio con Windows: no (puede activarse despues en modo tecnico)."
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
      WriteRegStr HKCU "Software\RENACE\Portal" "StartWithWindows" "0"
      StrCpy $R7 0

    renace_autostart_done:
  ${EndIf}

  DetailPrint "Configurando POS Agent PRO (impresoras ESC/POS)..."

  StrCpy $0 "$INSTDIR\resources\posagent\posagent.exe"
  ${If} ${FileExists} "$0"
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentPath" "$0"
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentInstalled" "1"
    WriteRegStr HKCU "Software\RENACE\Portal" "VcRedistChecked" "1"
    ${If} $R7 == 1
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO" '"$0"'
      DetailPrint "POS Agent: inicio automatico con Windows."
    ${Else}
      DetailPrint "POS Agent: sin inicio automatico."
    ${EndIf}
    SetOutPath "$INSTDIR\resources\posagent"
    Exec '"$0"'
    DetailPrint "POS Agent PRO listo."
  ${Else}
    DetailPrint "AVISO: no se encontro posagent.exe en resources — omite POS Agent."
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE Portal"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
  ; Preferencias de Portal: borrar solo en desinstalacion real (no upgrade)
  ${ifNot} ${isUpdated}
    DeleteRegKey HKCU "Software\RENACE\Portal"
  ${endIf}
!macroend
