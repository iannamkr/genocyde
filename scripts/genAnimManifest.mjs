#!/usr/bin/env node
// scripts/genAnimManifest.mjs
// Scans SpritesSeparated and writes src/data/animManifest.js
// Run: node scripts/genAnimManifest.mjs

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT   = path.join(__dirname, '..')
const SS_DIR = path.join(ROOT, 'public/assets/sprites/prototype/SpritesSeparated')
const OUT    = path.join(ROOT, 'src/data/animManifest.js')

// ─── FPS per state (default 12) ──────────────────────────────────────────────

const FPS = {
  Idle: 8, IdleTransition: 10,
  Run: 14, Sprint: 18, Walk: 10,
  Dash: 16, DashStart: 14, DashLoop: 16, DashEnd: 12,
  Jump: 10, JumpRise: 10, JumpMid: 8, JumpFall: 10, FrontFlip: 14,
  Land: 12, Roll: 14, Slide: 12, Spin: 14,
  Knockback: 10,
  LadderClimb: 10, LadderClimbFinish: 10, LadderClimbHorizontal: 10,
  LedgeClimb: 10, LedgeGrab: 8, LedgeHang: 8,
  WallClimb: 10, WallClimbIdle: 8, WallSlide: 8, WallJump: 12,
  ClimbIdle: 8, ClimbGrab: 10, ClimbLeft: 10, ClimbRight: 10,
  ClimbUpLeft: 10, ClimbUpRight: 10, ClimbDownLeft: 10, ClimbDownRight: 10,
  ClimbJumpPrepare: 10,
  MonkeyBarIdle: 8, MonkeyBarsClimb: 10,
  Crawl: 10, Crouch: 8, LookUp: 8, Fishing: 8,
  Pull: 10, Push: 10, PushIdle: 8, InteractionPull: 10,
  Die: 10,
  // Combat
  SwordIdle: 8, SwordRun: 12, SwordRunAlt: 12, SwordWalk: 10,
  SwordSprint: 16, SwordCrouch: 8,
  SwordJump: 10, SwordJumpRise: 10, SwordJumpMid: 8, SwordJumpFall: 10,
  SwordSlash01: 14, SwordRunSlash: 16, SwordSprintSlash: 16, StandingSlash: 12,
  SwordCombo01: 14, SwordCombo02: 14, SwordCombo03: 14, SwordCombo04: 14,
  CrouchSlash: 12, AirSlash: 14, AirSlashDown: 14, AirSlashUp: 14,
  GroundSlam: 12, Guard: 10, GuardImpact: 12,
  ShockHeavy: 12, ShockLight: 12, Stunned: 10,
  Hit: 12, HitUp: 12,
  Kick01: 14, Kick02: 14, Kick03: 14,
  Punch01: 14, Punch02: 14, Punch03: 14,
  ThrowOverarm: 12, ThrowUnderarm: 12,
  GunAim: 8, GunRun: 12, GunWalk: 10, GunSprint: 16, GunCrouch: 8,
  GunFire: 14, GunFire2H: 14, GunRunFire: 14, GunWalkFire: 14,
  GunSprintFire: 16, GunCrouchFire: 12, GunReload: 10,
  BowAim: 8, BowDraw: 10, BowFire: 14,
}

// ─── Loop states (repeat: -1) ─────────────────────────────────────────────────

const LOOP = new Set([
  'Idle', 'IdleTransition', 'Run', 'Walk', 'Sprint',
  'DashLoop', 'Crawl', 'Crouch', 'LookUp', 'Fishing',
  'LadderClimb', 'LadderClimbHorizontal',
  'ClimbIdle', 'ClimbLeft', 'ClimbRight', 'ClimbUpLeft', 'ClimbUpRight',
  'ClimbDownLeft', 'ClimbDownRight', 'ClimbGrab', 'ClimbJumpPrepare',
  'WallClimbIdle', 'WallSlide', 'WallClimb',
  'MonkeyBarIdle', 'MonkeyBarsClimb',
  'LedgeHang', 'Pull', 'Push', 'PushIdle',
  'SwordIdle', 'SwordRun', 'SwordRunAlt', 'SwordWalk', 'SwordSprint', 'SwordCrouch',
  'Guard', 'GunAim', 'GunRun', 'GunWalk', 'GunSprint', 'GunCrouch',
  'BowAim',
])

// ─── nextState after one-shot completes ──────────────────────────────────────

const NEXT = {
  // Movement
  DashStart: 'DashLoop', DashEnd: 'Run', DashLoop: null,
  Land: 'Run', Roll: 'Run', Slide: 'Run', Knockback: 'Idle',
  Jump: 'JumpRise', JumpRise: 'JumpMid', JumpMid: 'JumpFall', JumpFall: 'Land',
  FrontFlip: 'Run',
  LedgeClimb: 'Idle', LedgeGrab: 'LedgeHang',
  WallJump: 'JumpRise', LadderClimbFinish: 'Idle',
  InteractionPull: 'Idle',
  // Combat — sword
  SwordSlash01: 'SwordIdle',
  SwordRunSlash: 'SwordRun',
  SwordSprintSlash: 'SwordSprint',
  StandingSlash: 'SwordIdle',
  SwordCombo01: 'SwordIdle',
  SwordCombo02: 'SwordIdle',
  SwordCombo03: 'SwordIdle',
  SwordCombo04: 'SwordIdle',
  CrouchSlash: 'SwordCrouch',
  AirSlash: 'SwordJumpMid',
  AirSlashDown: 'SwordJumpMid',
  AirSlashUp: 'SwordJumpMid',
  GroundSlam: 'SwordIdle',
  GuardImpact: 'Guard',
  SwordJump: 'SwordJumpRise',
  SwordJumpRise: 'SwordJumpMid',
  SwordJumpMid: 'SwordJumpFall',
  SwordJumpFall: 'Land',
  // Combat — impact
  ShockHeavy: 'SwordIdle',
  ShockLight: 'Idle',
  Stunned: 'Idle',
  Hit: 'Idle',
  HitUp: 'Idle',
  // Unarmed
  Kick01: 'Idle', Kick02: 'Idle', Kick03: 'Idle',
  Punch01: 'Idle', Punch02: 'Idle', Punch03: 'Idle',
  ThrowOverarm: 'Idle', ThrowUnderarm: 'Idle',
  // Gun
  GunFire: 'GunAim', GunFire2H: 'GunAim', GunRunFire: 'GunRun',
  GunWalkFire: 'GunWalk', GunSprintFire: 'GunSprint', GunCrouchFire: 'GunCrouch',
  GunReload: 'GunAim',
  // Bow
  BowDraw: 'BowAim', BowFire: 'BowAim',
  // Death
  Die: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch { return [] }
}

function countPngs(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.png')).length }
  catch { return 0 }
}

function scanState(stateDir, stateName) {
  const partDirs = listDirs(stateDir)
  const parts = {}
  for (const part of partDirs) {
    const n = countPngs(path.join(stateDir, part))
    if (n > 0) parts[part] = n
  }
  return parts
}

// ─── Main scan ────────────────────────────────────────────────────────────────

const manifest = {}

// Top-level states (Idle, Run, Die, etc.)
for (const name of listDirs(SS_DIR)) {
  if (name === 'Combat') continue
  const dir   = path.join(SS_DIR, name)
  const parts = scanState(dir, name)
  if (Object.keys(parts).length === 0) continue
  manifest[name] = {
    dir:  `SpritesSeparated/${name}`,
    fps:  FPS[name]  ?? 12,
    loop: LOOP.has(name),
    next: NEXT[name] ?? null,
    parts,
  }
}

// Combat sub-states
const combatDir = path.join(SS_DIR, 'Combat')
for (const name of listDirs(combatDir)) {
  const dir   = path.join(combatDir, name)
  const parts = scanState(dir, name)
  if (Object.keys(parts).length === 0) continue
  manifest[name] = {
    dir:  `SpritesSeparated/Combat/${name}`,
    fps:  FPS[name]  ?? 12,
    loop: LOOP.has(name),
    next: NEXT[name] ?? 'Idle',
    parts,
  }
}

// ─── Write output ─────────────────────────────────────────────────────────────

const code = `// AUTO-GENERATED — do not edit by hand
// Run: node scripts/genAnimManifest.mjs

export const ANIM_MANIFEST = ${JSON.stringify(manifest, null, 2)}
`

fs.writeFileSync(OUT, code)
console.log(`✓ animManifest.js — ${Object.keys(manifest).length} states written to ${OUT}`)
