; RENACE Portal — NSIS hooks: instala POS Agent PRO + inicio con Windows
; Payload: $INSTDIR\resources\posagent\ (extraResources)

!include "FileFunc.nsh"
!include "LogicLib.nsh"

!macro customInstall
  DetailPrint "Configurando POS Agent PRO (impresoras ESC/POS)…"

  StrCpy $0 "$INSTDIR\resources\posagent\posagent.exe"
  ${If} ${FileExists} "$0"
    ; Autostart (usuario actual)
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO" '"$0"'
    ; Marca para el helper de Electron
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentPath" "$0"
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentInstalled" "1"
    ; Arrancar ahora (cwd = carpeta del agente para DLLs Qt)
    SetOutPath "$INSTDIR\resources\posagent"
    Exec '"$0"'
    DetailPrint "POS Agent PRO listo (inicio automático con Windows)."
  ${Else}
    DetailPrint "AVISO: no se encontró posagent.exe en resources — omite POS Agent."
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO"
  DeleteRegKey HKCU "Software\RENACE\Portal"
  ; No matamos posagent.exe aquí por si el usuario lo usa fuera del Portal
!macroend
