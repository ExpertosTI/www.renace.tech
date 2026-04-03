# IRON FURY - Paul Ultron
## WWII Tactical Action Game - Especificación de Diseño

---

## 1. Concepto & Visión

**IRON FURY** es un beat 'em up táctico ambientado en la Segunda Guerra Mundial con elementos sci-fi. El jugador controla a **Paul Ultron**, un comandante aerotransportado que puede:
- Entrar directamente al combate como soldado de infantería
- Controlar unidades AI/drones remotamente desde su dirigible "EAGLE-1"

**Sensación**: Intenso, estratégico, cinematográfico. Las ejecuciones con videos de Veo 3 transforman kills ordinarios en momentos épicos dignos de película de guerra.

---

## 2. Historia

### Personaje Principal: Paul Ultron

| Atributo | Detalle |
|----------|---------|
| **Nombre** | Paul Ultron |
| **Edad** | 32 |
| **Rango** | Captain, US Army Air Forces |
| **Especialidad** | Controlador de IA Neural Link / Tanque Commander |
| **Ubicación Base** | Dirigible "EAGLE-1" (comando aerotransportado) |

### Trama en 3 Actos

**ACTO 1 - EUROPA OCCIDENTAL (6 niveles)**
- Paul recibe órdenes de participar en Operation Overlord
- Su unidad pierde comunicación con HQ, debe actuar solo
- Videos: Desembarco de Normandía, storming de playas

**ACTO 2 - PACÍFICO (6 niveles)**
- La guerra se extiende al teatro del Pacífico
- Paul coordina ataques anfibios contra posiciones japonesas
- Videos: Batallas en playas de Guadalcanal, Iwo Jima

**ACTO 3 - NORTE DE ÁFRICA / OFENSIVA FINAL (4 niveles)**
- La última offensive del Eje debe ser detenida
- Paul descubre que los alemanes tienen tecnología AI experimental
- Videos: El Alamein, avance hacia Berlín

### Integración de Videos (Veo 3)

Los videos de Veo 3 se usan para:
- **Cutscenes de introducción** de cada acto
- **Briefings de misión**
- **Ejecuticiones/Furies** - cuando la barra de Fury está llena
- **Transiciones** entre niveles

---

## 3. Gameplay

### 3.1 Dual Combat System

Paul opera en **DOS MODOS SIMULTÁNEOS**:

#### Modo Soldado (Combate Terrestre)
- Vista: Tercera persona, follows Paul
- Controles:
  - **Joystick izquierdo**: Movimiento
  - **Botón A**: Disparar rifle
  - **Botón B**: Saltar/Cover
  - **Botón X**: Habilidad especial ( Knife throw, bayoneta)
  - **Botón Y**: Recargar + Llamar apoyo

#### Modo Comandante (Control AI)
- Vista: Top-down minimap
- Controles:
  - **D-Pad**: Seleccionar unidad AI
  - **L1/R1**: Cambiar entre unidades
  - **Botón A**: Orden de movimiento
  - **Botón B**: Orden de ataque
  - **Botón Y**: Super poder (Bomba nuclear, airstrike, artillería)

#### Simultaneidad
- Ambos modos están activos siempre
- Mientras Paul fight, puede dar órdenes a sus unidades
- Mismanagement = Paul queda vulnerable si se enfoca solo en comando

### 3.2 Fury System (Ejecuticiones)

**Fury Meter**:
- Se llena al encadenar kills, hacer combos, y completar objetivos
- Tiene 3 niveles:
  - **Lv1 Fury (25%)**: Ejecución rápida (video corto 5-10s)
  - **Lv2 Fury (50%)**: Ejecución brutal (video 15-20s)
  - **Lv3 Fury (100%)**: **BOMBA NUCLEAR** - Video cinematográfico del hongo atómico + destrucción masiva de enemigos

**Tipos de Ejecución**:
- **Ground Fury**: Paul ejecuta enemigos cuerpo a cuerpo
- **Airstrike Fury**: Llamada de drone para bombardment
- **Artillery Fury**: Bombardero B-17 ataca zona
- **Nuclear Fury**: Super arma, solo 1x por nivel, area MASSIVA

### 3.3 Estructura de Niveles

---

## 3.4 Sistema de Selección de Personaje

### Pantalla de Selección
```
╔════════════════════════════════════════════════════════════╗
║              SELECCIÓN DE PERSONAJE                         ║
║  [Video Veo 3: Paul en el puente de mando]                 ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🎖️ PAUL ULTRON (Comandante)              [SKIN] ⚡        ║
║     Modo: Dual (Soldado + Comandante)                      ║
║     Difícil - Requiere multitask                           ║
║                                                            ║
║  🔫 SGT. JACK "TRIGGER" MURPHY       [MODO] 🔥             ║
║     Modo: Soldado puro (sin comando AI)                    ║
║     Difícil - Pero más fácil que Paul                       ║
║                                                            ║
║  🎯 CPL. NATASHA "HAWK" KOWALSKI    [MODO] ❄️             ║
║     Modo: Francotirador (stealth, one-shot kills)          ║
║     Media - Sigilo y precisión                              ║
║                                                            ║
║  💣 SGT. "TNT" TOMÁS RIVERA         [MODO] 💥             ║
║     Modo: Demoliciones (bazooka, grenades, nuclear)        ║
║     Media - Explosiones masivas                             ║
║                                                            ║
║  🛡️ CPL. HANS "IRON" MÜLLER         [SKIN] 🇩🇪            ║
║     Modo: Igual a Paul Ultron                               ║
║     Difícil - Pero con skin alemán                          ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  ⚠️ ¿SELECCIONAR ESTE MODO O SOLO SKIN?                    ║
║                                                            ║
║  [JUGAR CON ESTE MODO]    [SOLO USAR SKIN]                 ║
╚════════════════════════════════════════════════════════════╝
```

### Tabla de Dificultad por Personaje

| Personaje | Modo | Dificultad | Habilidad Especial |
|-----------|------|------------|-------------------|
| Paul Ultron | Dual (Soldado + Comandante) | ★★★☆☆ | Control de unidades AI |
| Sgt. Murphy | Soldado | ★★☆☆☆ | Disparo rápido |
| Cpl. Kowalski | Francotirador | ★★★☆☆ | Stealth, headshots |
| Sgt. Rivera | Demoliciones | ★★☆☆☆ | Bomba nuclear más rápido |
| Hans Müller | Dual | ★★★☆☆ | Skin alemán (solo cosmético) |

### Sistema de Confirmación
```
╔════════════════════════════════════════════════════════════╗
║  ⚠️ CONFIRMACIÓN DE SELECCIÓN                              ║
║                                                            ║
║  Has elegido: SGT. TOMÁS "TNT" RIVERA                     ║
║                                                            ║
║  Modo DEMOLICIONES seleccionado:                           ║
║  • Acceso a: Bazooka, Grenades, Bomba Nuclear              ║
║  • Sin acceso a: Control de unidades AI                   ║
║  • Dificultad: ★★☆☆☆ (Media)                              ║
║                                                            ║
║  ¿Jugar con este MODO o solo usar este SKIN?               ║
║                                                            ║
║  [🔥 JUGAR CON MODO DEMOLICIONES]                          ║
║  [👤 SOLO USAR SKIN DE RIVERA]                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 3.5 Sistema de Recompensas ($GAN + XP)

```
╔════════════════════════════════════════════════════════════╗
║                    SISTEMA DE RECOMPENSAS                   ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  💰 $GAN                                                   ║
║  ├── Gana por completar niveles                            ║
║  ├── Bonus por no morir (no game over)                    ║
║  ├── Bonus por Fury meter lleno                            ║
║  └── Canjeable por: skins, personajes, upgrades           ║
║                                                            ║
║  ⭐ XP / EXPERIENCIA                                       ║
║  ├── Por cada kill                                         ║
║  ├── Por completar oleadas                                 ║
║  ├── Por completar niveles                                 ║
║  └── Desbloquea: nuevos niveles, habilidades               ║
║                                                            ║
║  🏆 LOGROS/TÍTULOS                                         ║
║  ├── "First Blood" - Primer kill                           ║
║  ├── "Fury Unleashed" - Primera ejecución                  ║
║  ├── "Berlin Liberator" - Completar juego                  ║
║  └── "Nuclear Holocaust" - Usar 10 bombas                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Mapa Estratégico WWII:**

```
🇪🇺 EUROPA OCCIDENTAL (Unlockable)
├── Nivel 1: Playa de Omaha
├── Nivel 2: Burgos de Normandía
├── Nivel 3: París Liberada
├── Nivel 4: Operación Market Garden
├── Nivel 5: Batalla del Bulge
└── Nivel 6: Cruce del Rin → BERLIN

🇯🇵 PACÍFICO (Unlockable)
├── Nivel 7: Guadalcanal
├── Nivel 8: Tarawa
├── Nivel 9: Iwo Jima
├── Nivel 10: Okinawa
├── Nivel 11: Philippines
└── Nivel 12: Tokyo Bay

🇩🇿 NORTE DE ÁFRICA (Unlockable)
├── Nivel 13: El Alamein
├── Nivel 14: Túnez
├── Nivel 15: Casablanca
└── Nivel 16: Montecassino → BERLIN
```

**Cada nivel incluye:**
- Cutscene de video (Veo 3)
- Briefing de misión
- 3-5 oleadas de enemigos
- 1 Boss (Tank Commander, Sniper Elite, etc.)
- Finale de video
- Recompensas (XP, desbloqueos)

---

## 4. Sprites & Arte

### Pixel Art Style
- **Resolución**: 32x32 para sprites pequeños, 64x64 para personajes principales
- **Paleta**: Verde olivo, kaki, gris military, explosiones naranjas/rojas
- **Efectos**: Pixel art para balas, chispas, sangre 8-bit

### Sprite Sheet Plan

#### Unidades Aliadas
| Archivo | Descripción | Frames |
|---------|-------------|--------|
| `paul_idle.png` | Paul Ultron, posición de espera | 4 |
| `paul_walk.png` | Paul caminando | 6 |
| `paul_shoot.png` | Paul disparando | 4 |
| `paul_fury.png` | Paul en modo ejecución | 8 |
| `paul_knife.png` | Paul con cuchillo/bayoneta | 4 |
| `sherman_tank.png` | M4 Sherman tank | Walk(8), Turret(4), Destroy(2) |
| `pershing_tank.png` | M26 Pershing | Walk(8), Turret(4), Destroy(2) |
| `infantry_at.png` | Soldado con bazooka | Walk(4), Aim(2), Fire(2) |
| `jeep_recon.png` | Jeep de reconocimiento | Drive(4), Stop(1) |

#### Unidades Enemigas
| Archivo | Descripción |
|---------|-------------|
| `panzer4_sprite.png` | Panzer IV alemán |
| `tiger1_sprite.png` | Tiger I (Boss) |
| `infantry_ger_basic.png` | Soldado alemán raso |
| `infantry_ger_officer.png` | Oficial alemán (ejecución bonus) |
| `infantry_jap_basic.png` | Soldado japonés |
| `infantry_jap_officer.png` | Oficial japonés |
| `type97_tank.png` | Tanque japonés Type 97 |
| `zero_plane.png` | Mitsubishi A6M Zero |
| `bf109_plane.png` | Messerschmitt Bf 109 |

#### Entornos
| Archivo | Descripción |
|---------|-------------|
| `bg_europe_day.png` | Ciudad europea, día |
| `bg_europe_night.png` | Ciudad europea, noche |
| `bg_pacific_beach.png` | Playa tropical, bunkers |
| `bg_pacific_jungle.png` | selva tropical |
| `bg_africa_desert.png` | Desierto, dunas |
| `bg_africa_fort.png` | Fuerte/muralla |
| `tilemap_europe.png` | Tileset urbano europeo |
| `tilemap_pacific.png` | Tileset playa/jungla |
| `tilemap_africa.png` | Tileset desierto |

#### Efectos & UI
| Archivo | Descripción |
|---------|-------------|
| `explosion_small.png` | Explosión de bala |
| `explosion_large.png` | Explosión de tanque/granada |
| `explosion_nuke.png` | Hongo atómico (animación 16 frames) |
| `fury_bar.png` | Barra de Fury (vacía/llenando/llena) |
| `health_bar.png` | Barra de vida Paul |
| `nuke_icon.png` | Icono de bomba nuclear |
| `minimap_frame.png` | Frame del minimapa |
| `video_overlay.png` | Overlay para videos |
| `eagle1_dirigible.png` | Dirigible de Paul (HUD) |

### Efectos de Video Integration

Los sprites de transición:
- `video_fade_in.png` / `video_fade_out.png`
- `cutscene_frame.png` - Borde cinematográfico para videos

---

## 5. Audio & Efectos de Sonido

### Música
- **Battle Theme**: Orchestral épica, brass + drums
- **Boss Theme**: Más intensa, warning drums
- **Fury Theme**: Cuando Fury está lleno, música ominosa
- **Victory Theme**: Fanfare épico
- **Menu Theme**: Suspense WWII, piano + strings

### SFX (Efectos de Sonido)
| Categoría | Sonidos |
|-----------|---------|
| **Armas** | Rifle Garand, M1919 ametralladora, bazooka, Pistola |
| **Explosiones** | Granada, tanque, avión, BOMBA NUCLEAR |
| **Pasos** | Pasos en grava, metal, agua |
| **Voces** | "Frag out!", "Reload!", "Enemy down!", "FURY READY!" |
| **Ambient** | Aviones pasando, sirenas, tanques motor |
| **UI** | Click de menú,Upgrade sonido, notificación |

### Voces para Ejecución (Fury)
- "TARGET ELIMINATED"
- "FURY UNLEASHED"
- "TOTAL DESTRUCTION"
- Sonidos de motores de bombardero

---

## 6. Estructura de Pantallas

### 6.1 Menú Principal
```
╔══════════════════════════════════════╗
║         IRON FURY                    ║
║      [Video Background: Paul         ║
║       en el puente EAGLE-1]          ║
║                                      ║
║    ▶ JUGAR                            ║
║    ▶ PERSONAJES                       ║
║    ▶ ARMAMENTO                        ║
║    ▶ OPCIONES                         ║
║    ▶ MULTIPLAYER (Próximamente)      ║
╚══════════════════════════════════════╝
```

### 6.2 Mapa de Campaña
```
╔══════════════════════════════════════╗
║  ACTO 1: EUROPA OCCIDENTAL           ║
║  [Eagle-1 volando sobre mapa]        ║
║                                      ║
║  ●N1  ●N2  ●N3  ○N4  ○N5  ○N6       ║
║  (completados)    (bloqueados)        ║
║                                      ║
║  ●N7  ○N8  ...  (Pacifico lockeado)  ║
║                                      ║
╚══════════════════════════════════════╝
```

### 6.3 Pantalla de Combate (HUD)
```
╔══════════════════════════════════════╗
║ [VIDA PAUL] ████████░░  [MINIMAP]   ║
║ [FURY ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░] Lv2  ║
║                                      ║
║                                      ║
║         [ÁREA DE COMBATE]           ║
║            Paul + Enemigos           ║
║                                      ║
║                                      ║
║ [UNIDAD AI]  [DRONE]  [AIRSTRIKE]   ║
║    L1/R1       Y        X           ║
╚══════════════════════════════════════╝
```

### 6.4 Flujo Completo del Juego
```
🎬 INTRO VIDEO (Veo 3)
    ↓
📺 MENÚ PRINCIPAL
    ↓
🗺️ SELECCIÓN DE CAMPAÑA
    ↓
🎬 VIDEO BRIEFING (Veo 3)
    ↓
⚔️ COMBATE (Gameplay Loop)
    ├── Oleada de enemigos
    ├── Fury meter llena
    ├── 🎬 VIDEO EJECUCIÓN (Veo 3)
    └── Repite hasta Boss
    ↓
🎬 VIDEO VICTORIA
    ↓
📊 PANTALLA DE RESULTADOS
    ↓
🔓 DESBLOQUEO DE CONTENIDO
    ↓
🗺️ SIGUIENTE NIVEL
```

---

## 7. Tech Stack

### Fase 1: Prototipo Web
| Capa | Tecnología |
|------|------------|
| **Game Engine** | Phaser 3.60+ (2D, mobile-ready, excellent performance) |
| **UI Framework** | React 18 (menús, HUD overlay) |
| **State Management** | Zustand (lightweight, perfect para games) |
| **Video Integration** | HTML5 Video API + Phaser add |
| **Backend** | LocalStorage (guardado), JSON files |
| **Build Tool** | Vite |
| **Mobile Export** | Capacitor |

### Fase 2: Multiplayer (Futuro)
| Capa | Tecnología |
|------|------------|
| **Real-time** | Socket.io o Cloudflare WebRTC |
| **Game Server** | Node.js + Express |
| **Matchmaking** | Custom o PlayFab |
| **Database** | PostgreSQL + Redis |

### Estructura de Proyecto
```
iron-fury/
├── src/
│   ├── game/                 # Phaser game
│   │   ├── scenes/          # Boot, Menu, Game, UI
│   │   ├── entities/        # Paul, tanks, enemies
│   │   ├── systems/         # Fury, Combat, AI
│   │   └── maps/            # Level data
│   ├── ui/                  # React components
│   │   ├── components/     # Botones, HUD, menus
│   │   └── screens/        # Menu, Map, Results
│   ├── assets/             # Sprites, audio, videos
│   │   ├── sprites/
│   │   ├── audio/
│   │   └── videos/         # Veo 3 cutscenes
│   ├── stores/             # Zustand stores
│   └── utils/              # Helpers
├── docs/
│   └── specs/
├── capacitor.config.ts
├── package.json
└── vite.config.ts
```

---

## 8. Sprites a Crear (Lista Prioritaria)

### Prioridad ALTA (Necesarios para MVP)
1. `paul_soldier_spritesheet.png` - Paul idle, walk, shoot
2. `infantry_ger_spritesheet.png` - Enemigo alemán básico
3. `infantry_jap_spritesheet.png` - Enemigo japonés básico
4. `tilemap_combat_test.png` - Tileset de prueba
5. `fury_bar_spritesheet.png` - UI de fury
6. `health_bar_spritesheet.png` - UI de vida

### Prioridad MEDIA (Gameplay completo)
7. `tank_sherman_spritesheet.png` - Unidad AI aliada
8. `tank_panzer4_spritesheet.png` - Enemigo tanque
9. `tank_tiger_spritesheet.png` - Boss tanque
10. `explosion_spritesheet.png` - Efectos de explosión
11. `nuke_mushroom_spritesheet.png` - Bomba nuclear

### Prioridad BAJA (Polish)
12. Aviones, jeeps, secundaria
13. Sprites de transición de video
14. Efectos de partículas avanzados

---

## 9. Multiplayer Roadmap

### Fase 1: Local (MVP)
- Guardado local
- Niveles offline

### Fase 2: Leaderboards
- Scores global
- Desafíos semanales

### Fase 3: Co-op Async
- 2 jugadores cooperativo vs oleadas
- Invitar amigos

### Fase 4: PvP
- Duelo 1v1
- Tu setup de tropas vs el mío

---

## 10. Success Criteria

- ✅ Paul Ultron puede fightear como soldado
- ✅ Paul puede comandar unidades AI
- ✅ Fury meter llena con combos
- ✅ Videos de Veo 3 se reproducen en ejecuciones
- ✅ 3 actos con 16 niveles
- ✅ Sprites pixel art created
- ✅ Mobile-ready (iOS/Android via Capacitor)
- ✅ Performance: 60fps en móvil

---

*Documento creado: 2026-04-02*
*Autor: AI Assistant + Renso*
