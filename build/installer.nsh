; RENACE Portal — NSIS hooks:
; 1) Detecta / instala Visual C++ Redistributable (x64) si falta
; 2) Configura POS Agent PRO + inicio con Windows
; Payload: $INSTDIR\resources\posagent\ + $INSTDIR\resources\vcredist\

!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

; Devuelve 1 en $R9 si VC++ 2015-2022 x64 está instalado
!macro RenaceHasVcRedist
  StrCpy $R9 0
  ; Vista nativa 64-bit del registro (evitar WOW64)
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

!macro customInstall
  DetailPrint "Comprobando Microsoft Visual C++ Redistributable (x64)…"
  !insertmacro RenaceHasVcRedist
  ${If} $R9 == 1
    DetailPrint "Visual C++ Redistributable (x64) ya presente."
  ${Else}
    StrCpy $0 "$INSTDIR\resources\vcredist\VC_redist.x64.exe"
    ${If} ${FileExists} "$0"
      DetailPrint "Instalando Visual C++ Redistributable (requerido por POS Agent)…"
      ; /quiet /norestart — necesita elevation (allowElevation del NSIS)
      ExecWait '"$0" /install /quiet /norestart' $1
      DetailPrint "VC++ Redistributable código de salida: $1"
      ; 0 = ok, 1638 = ya hay versión más nueva, 3010 = reboot required
      ${If} $1 == 0
      ${OrIf} $1 == 1638
      ${OrIf} $1 == 3010
        DetailPrint "Visual C++ Redistributable listo."
      ${Else}
        DetailPrint "AVISO: VC++ no se instaló (código $1). POS Agent puede fallar."
        MessageBox MB_ICONEXCLAMATION|MB_OK "No se pudo instalar Visual C++ Redistributable (código $1).$\r$\n$\r$\nPOS Agent puede dar error al abrir. Ejecuta como administrador:$\r$\n$INSTDIR\resources\vcredist\VC_redist.x64.exe"
      ${EndIf}
    ${Else}
      DetailPrint "AVISO: no está empaquetado VC_redist.x64.exe"
      MessageBox MB_ICONEXCLAMATION|MB_OK "Falta Visual C++ Redistributable en el instalador.$\r$\nPOS Agent (impresoras) puede no arrancar."
    ${EndIf}
  ${EndIf}

  DetailPrint "Configurando POS Agent PRO (impresoras ESC/POS)…"

  StrCpy $0 "$INSTDIR\resources\posagent\posagent.exe"
  ${If} ${FileExists} "$0"
    ; Autostart (usuario actual)
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RENACE POS Agent PRO" '"$0"'
    ; Marca para el helper de Electron
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentPath" "$0"
    WriteRegStr HKCU "Software\RENACE\Portal" "PosAgentInstalled" "1"
    WriteRegStr HKCU "Software\RENACE\Portal" "VcRedistChecked" "1"
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
  ; No desinstalamos VC++ (compartido con otras apps)
!macroend
