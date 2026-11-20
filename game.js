import { createPainter } from './art.js'

const get = id => document.getElementById(id)
const canvas = get('game')
const cabinet = get('cabinet')
const { ctx, scenery, fighter, box, ellipse } = createPainter(canvas)
const fields = ['health', 'charge', 'sector', 'score', 'pause', 'overlay', 'kicker', 'title', 'message', 'start', 'boss-panel', 'boss-health', 'objective', 'mute']
const ui = Object.fromEntries(fields.map(id => [id, get(id)]))
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const sectors = [
  { name: 'Dry Creek', waves: [['raider', 'raptor'], ['raider', 'raptor']] },
  { name: 'Overgrown Pass', waves: [['raptor', 'raider', 'raptor'], ['raider', 'raider', 'raptor']] },
  { name: 'Extraction Point', waves: [['raptor', 'raider'], ['alpha']] },
]
const types = {
  raider: { hp: 3, speed: 53, damage: 8, tell: .46, reach: 22, points: 200 },
  raptor: { hp: 2, speed: 68, damage: 10, tell: .39, reach: 28, points: 350 },
  alpha: { hp: 12, speed: 53, damage: 14, tell: .72, reach: 36, points: 1600 },
}
const strikes = [
  { duration: .24, impact: .07, range: 42, depth: 22, damage: 1, push: 5 },
  { duration: .24, impact: .08, range: 45, depth: 22, damage: 1, push: 7 },
  { duration: .35, impact: .11, range: 51, depth: 23, damage: 2, push: 16 },
]
const roll = { duration: .32 }
const shockwave = { duration: .42, impact: .1, range: 83, depth: 43, damage: 3, push: 19 }
const controls = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL'])
const actionKeys = new Set(['KeyJ', 'KeyK', 'KeyL'])
const keys = new Set()
const touches = new Map()
const queued = new Map()
const hero = {}
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))
const point = value => String(value).padStart(2, '0')
let mode = 'title', sector = 0, wave = 0, score = 0, enemies = [], sparks = []
let time = 0, banner = 0, shake = 0, streak = 0, streakTimer = 0
let nextWave = 0, exitOpen = false, audio, gain, muted = false

function enableAudio() {
  try {
    if (!audio && window.AudioContext) {
      audio = new AudioContext()
      gain = audio.createGain()
      gain.gain.value = muted ? 0 : .23
      gain.connect(audio.destination)
    }
    if (audio?.state === 'suspended') audio.resume().catch(() => {})
  } catch {
    audio = undefined
  }
}

function sound(start, end, length, type = 'triangle', level = .25) {
  if (!audio || muted || audio.state !== 'running') return
  const now = audio.currentTime
  const voice = audio.createOscillator()
  const envelope = audio.createGain()
  voice.type = type
  voice.frequency.setValueAtTime(start, now)
  voice.frequency.exponentialRampToValueAtTime(end, now + length)
  envelope.gain.setValueAtTime(level, now)
  envelope.gain.exponentialRampToValueAtTime(.001, now + length)
  voice.connect(envelope).connect(gain)
  voice.addEventListener('ended', () => {
    voice.disconnect()
    envelope.disconnect()
  }, { once: true })
  voice.start(now)
  voice.stop(now + length)
}

function hud() {
  ui.health.value = hero.hp
  ui.charge.value = hero.charge
  ui.sector.textContent = `${point(sector + 1)} / ${point(sectors.length)}`
  ui.score.textContent = String(score).padStart(6, '0')
  if (ui['boss-panel'] && ui['boss-health']) {
    const boss = enemies.find(enemy => enemy.kind === 'alpha')
    ui['boss-panel'].hidden = !boss
    if (boss) {
      ui['boss-health'].max = types.alpha.hp
      ui['boss-health'].value = boss.hp
    }
  }
}

function objective(text) {
  if (ui.objective) ui.objective.textContent = text
}

function openOverlay(label, title, message, button) {
  ui.kicker.textContent = label
  ui.title.textContent = title
  ui.message.textContent = message
  ui.start.textContent = button
  ui.overlay.hidden = false
  ui.start.focus({ preventScroll: true })
}

function spawnWave() {
  const roster = sectors[sector].waves[wave]
  enemies = roster.map((kind, i) => ({
    ...types[kind], kind, x: 355 + (i % 2) * 57, y: [211, 242, 187][i],
    face: -1, cooldown: .36 + i * .24, windup: 0, hurt: 0, moving: false,
    attackType: '', lunge: 0, enraged: false, activeAfter: .05 + i * .23,
  }))
  const boss = roster.includes('alpha')
  objective(boss ? 'Defeat the Alpha. Roll through its charge.' : `Clear the road · Wave ${wave + 1} of ${sectors[sector].waves.length}`)
  if (boss) sound(101, 38, .45, 'sawtooth', .19)
  hud()
}

function enterSector() {
  Object.assign(hero, {
    x: 66, y: 224, face: 1, action: '', hurt: 0, moving: false,
    invulnerable: .6, combo: -1, comboWindow: 0, vx: 1, vy: 0,
  })
  wave = 0
  sparks = []
  nextWave = 0
  exitOpen = false
  banner = 1.6
  spawnWave()
}

function clearInput() {
  keys.clear()
  touches.clear()
  queued.clear()
}

function resume() {
  mode = 'play'
  clearInput()
  ui.overlay.hidden = true
  ui.pause.disabled = false
  cabinet.focus({ preventScroll: true })
  startLoop()
}

function activate() {
  enableAudio()
  if (mode === 'pause') {
    resume()
    return
  }
  Object.assign(hero, { hp: 100, charge: 100 })
  sector = 0
  score = 0
  streak = 0
  streakTimer = 0
  shake = 0
  time = 0
  enterSector()
  resume()
  sound(225, 440, .22)
}

function pause() {
  if (mode !== 'play') return
  mode = 'pause'
  clearInput()
  stopLoop()
  ui.pause.disabled = true
  openOverlay('RUN PAUSED', 'PAUSED', 'Resume to pick up where you left off.', 'RESUME RUN ▸')
}

function finish(won) {
  mode = won ? 'win' : 'over'
  clearInput()
  ui.pause.disabled = true
  objective(won ? 'Extraction complete' : 'Run over')
  openOverlay(
    `FINAL SCORE · ${score.toLocaleString()}`,
    won ? 'EXTRACTED' : 'RUN OVER',
    won ? 'You cleared the highway and made it to the car.' : 'Roll through enemy attacks and answer with a strike chain.',
    'PLAY AGAIN ▸',
  )
  sound(won ? 262 : 140, won ? 523 : 36, .4)
}

function burst(x, y, color, count) {
  if (reducedMotion.matches) return
  for (let i = 0; i < count; i++) {
    sparks.push({
      x, y, color,
      vx: (Math.random() - .5) * 145,
      vy: -35 - Math.random() * 70,
      life: .2 + Math.random() * .22,
    })
  }
}

function hitEnemies() {
  const { range, depth, damage, push } = hero.attack
  let hit = false
  for (const enemy of enemies) {
    const dx = enemy.x - hero.x
    if (enemy.activeAfter > 0 || Math.abs(dx) > range || Math.abs(enemy.y - hero.y) > depth) continue
    if (hero.action === 'strike' && dx * hero.face < -12) continue
    const charging = enemy.kind === 'alpha' && (enemy.attackType === 'lunge' || enemy.lunge > 0)
    enemy.hp -= damage
    const entersSecondPhase = enemy.kind === 'alpha' && !enemy.enraged && enemy.hp <= 6
    if (!charging || hero.action === 'wave') {
      enemy.x = clamp(enemy.x + (Math.sign(dx) || hero.face) * (enemy.kind === 'alpha' ? push * .5 : push), 18, 462)
      enemy.hurt = .15
      enemy.windup = 0
      enemy.lunge = 0
      enemy.attackType = ''
      enemy.cooldown = enemy.kind === 'alpha' ? .3 : .36
    }
    if (entersSecondPhase) {
      enemy.enraged = true
      const direction = Math.sign(hero.x - enemy.x)
      enemy.face = direction || enemy.face
      enemy.attackType = 'lunge'
      enemy.windup = .57
    }
    streak++
    streakTimer = 1.6
    score += 25 * Math.min(streak, 8) + (enemy.hp <= 0 ? enemy.points : 0)
    hero.charge = Math.min(100, hero.charge + (hero.action === 'strike' ? 18 : 0))
    shake = .09
    burst(enemy.x, enemy.y - 23, '#f6cf8a', hero.action === 'wave' ? 15 : 8)
    hit = true
  }
  if (!hit) return
  sound(hero.action === 'wave' ? 190 : 135, 38, .16, 'square', .14)
  enemies = enemies.filter(enemy => enemy.hp > 0)
  hud()
}

function begin(action, dx, dy) {
  hero.action = action
  hero.elapsed = 0
  hero.impactDone = false
  if (action === 'strike') {
    hero.combo = hero.comboWindow > 0 ? (hero.combo + 1) % strikes.length : 0
    hero.attack = strikes[hero.combo]
    hero.comboWindow = .64
    sound(154 + hero.combo * 34, 77, .055, 'triangle', .15)
  } else if (action === 'roll') {
    const length = Math.hypot(dx, dy) || 1
    hero.vx = (dx || (dy ? 0 : hero.face)) / length
    hero.vy = dy / length
    hero.attack = roll
    hero.invulnerable = Math.max(hero.invulnerable, .38)
    sound(220, 75, .15)
  } else {
    hero.attack = shockwave
    hero.charge = 0
    sound(77, 330, .27, 'sine', .37)
    hud()
  }
}

function moveHero(dx, dy, dt, fraction = 1) {
  const scale = dt * fraction / (dx && dy ? Math.SQRT2 : 1)
  hero.x += dx * scale * 107
  hero.y += dy * scale * 87
  hero.moving = !!(dx || dy)
}

function updateHero(dt) {
  hero.hurt = Math.max(0, hero.hurt - dt)
  hero.invulnerable = Math.max(0, hero.invulnerable - dt)
  hero.comboWindow -= dt
  for (const [key, expires] of queued) {
    if (expires < time) queued.delete(key)
  }
  const touchKeys = [...touches.values()]
  const held = (...codes) => codes.some(code => keys.has(code) || touchKeys.includes(code))
  const dx = +held('ArrowRight', 'KeyD') - +held('ArrowLeft', 'KeyA')
  const dy = +held('ArrowDown', 'KeyS') - +held('ArrowUp', 'KeyW')
  hero.moving = false
  if (hero.action) {
    hero.elapsed += dt
    if (hero.action === 'roll') {
      hero.x += hero.vx * dt * 210
      hero.y += hero.vy * dt * 142
    } else if (hero.action === 'strike') moveHero(dx, dy, dt, .46)
    if (hero.attack.impact && hero.elapsed >= hero.attack.impact && !hero.impactDone) {
      hero.impactDone = true
      hitEnemies()
    }
    if (hero.elapsed >= hero.attack.duration) hero.action = ''
  } else moveHero(dx, dy, dt)
  if (!hero.action) {
    if (dx) hero.face = dx
    if (queued.delete('KeyK')) begin('roll', dx, dy)
    else if (queued.delete('KeyL') && hero.charge === 100) begin('wave', dx, dy)
    else if (queued.delete('KeyJ') || held('KeyJ')) {
      if (!dx) {
        const target = enemies.find(enemy => Math.abs(enemy.x - hero.x) <= 48 && Math.abs(enemy.y - hero.y) <= 23)
        if (target) hero.face = Math.sign(target.x - hero.x) || hero.face
      }
      begin('strike', dx, dy)
    }
  }
  hero.x = clamp(hero.x, 17, 463)
  hero.y = clamp(hero.y, 185, 251)
}

function hitHero(enemy, extraDamage = 0) {
  if (hero.invulnerable > 0) return
  hero.hp = Math.max(0, hero.hp - enemy.damage - extraDamage)
  hero.hurt = .19
  hero.invulnerable = .67
  hero.x = clamp(hero.x + enemy.face * 14, 17, 463)
  streak = 0
  shake = .17
  burst(hero.x, hero.y - 20, '#fb8b6b', 10)
  sound(110, 32, .21, 'sawtooth', .24)
  hud()
}

function updateEnemy(enemy, dt) {
  enemy.moving = false
  enemy.activeAfter -= dt
  if (enemy.activeAfter > 0) return
  enemy.cooldown -= dt
  if (enemy.hurt > 0) {
    enemy.hurt -= dt
    return
  }

  const dx = hero.x - enemy.x
  const dy = hero.y - enemy.y
  const inRange = Math.abs(dx) < enemy.reach && Math.abs(dy) < 13
  if (enemy.lunge > 0) {
    enemy.lunge -= dt
    enemy.moving = true
    enemy.x = clamp(enemy.x + enemy.face * 185 * dt, 18, 462)
    if (Math.abs(hero.x - enemy.x) < 28 && Math.abs(dy) < 15) hitHero(enemy, 4)
    if (enemy.lunge <= 0) {
      enemy.cooldown = .84
      enemy.attackType = ''
    }
    return
  }
  if (enemy.windup > 0) {
    enemy.windup = Math.max(0, enemy.windup - dt)
    if (enemy.windup > 0) return
    if (enemy.attackType === 'lunge') {
      enemy.lunge = .43
      sound(118, 43, .31, 'sawtooth', .17)
    } else {
      if (inRange && dx * enemy.face >= -5) hitHero(enemy)
      enemy.cooldown = enemy.kind === 'raptor' ? .49 : .58
      enemy.attackType = ''
    }
    return
  }
  if (Math.abs(dx) > 2) enemy.face = Math.sign(dx)
  const wantsLunge = enemy.enraged && Math.abs(dx) < 114 && Math.abs(dy) < 16
  if (enemy.cooldown <= 0 && (inRange || wantsLunge)) {
    enemy.attackType = wantsLunge ? 'lunge' : 'bite'
    enemy.windup = wantsLunge ? .57 : enemy.tell
    return
  }
  if (inRange) return
  if (Math.abs(dx) > enemy.reach - 4) enemy.x += Math.sign(dx) * enemy.speed * dt
  if (Math.abs(dy) > 3) enemy.y += Math.sign(dy) * enemy.speed * dt * .76
  enemy.moving = true
}

function update(dt) {
  time += dt
  banner -= dt
  shake = Math.max(0, shake - dt)
  streakTimer -= dt
  if (streakTimer <= 0) streak = 0
  updateHero(dt)
  for (const enemy of enemies) updateEnemy(enemy, dt)
  for (const spark of sparks) {
    spark.life -= dt
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
    spark.vy += 270 * dt
  }
  sparks = sparks.filter(spark => spark.life > 0)
  if (hero.hp <= 0) {
    finish(false)
    return
  }
  if (enemies.length) return
  if (wave < sectors[sector].waves.length - 1) {
    if (nextWave === 0) {
      nextWave = time + 1.1
      objective('Incoming reinforcements')
    } else if (time >= nextWave) {
      wave++
      nextWave = 0
      spawnWave()
    }
    return
  }
  const lastSector = sector === sectors.length - 1
  if (!exitOpen) {
    exitOpen = true
    objective(lastSector ? 'Road clear · Head right to the car' : 'Road clear · Head right to advance')
    sound(210, 490, .19)
  }
  if (hero.x >= 446) {
    if (lastSector) finish(true)
    else {
      sector++
      hero.hp = Math.min(100, hero.hp + 27)
      enterSector()
    }
  }
}

function label(text, x, y, color = '#fff0ce') {
  ctx.font = 'bold 10px monospace'
  ctx.textBaseline = 'top'
  box(x - 5, y - 3, ctx.measureText(text).width + 10, 16, '#142525')
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function draw() {
  scenery(sector, mode === 'title')
  if (mode === 'title') {
    fighter({ kind: 'alpha', x: 408, y: 218, face: -1 }, 0, false)
    fighter({ x: 323, y: 236, face: 1 }, 0, true)
    return
  }
  ctx.save()
  if (shake > 0 && !reducedMotion.matches) ctx.translate(Math.round(Math.sin(time * 180) * 2), Math.round(Math.cos(time * 133) * 2))
  const actors = [...enemies, hero].sort((a, b) => a.y - b.y)
  for (const actor of actors) {
    if (actor.activeAfter > 0) continue
    if (actor.attackType === 'lunge' && actor.windup > 0) {
      const width = actor.face === 1 ? Math.min(106, 475 - actor.x) : -Math.min(106, actor.x - 5)
      box(actor.x, actor.y - 6, width, 12, '#ee853d55')
      box(actor.x, actor.y + 5, width, 1, '#ffd58d')
    }
    fighter(reducedMotion.matches ? { ...actor, hurt: 0 } : actor, time, actor === hero)
  }
  if (hero.action === 'wave' && hero.impactDone) {
    const radius = 24 + hero.elapsed * 145
    ellipse(hero.x, hero.y, radius, radius * .23, '#f6dd8a50')
  }
  for (const spark of sparks) box(spark.x, spark.y, 2, 2, spark.color)
  ctx.restore()
  if (banner > 0) label(sectors[sector].name.toUpperCase(), 14, 16)
  if (streak > 1) label(`${streak} HIT COMBO`, 383, 16, '#f8c46c')
  if (exitOpen) label(sector === sectors.length - 1 ? 'CAR  >' : 'GO  >', 415, 201, '#f8c46c')
}

function queue(key) {
  if (actionKeys.has(key)) queued.set(key, time + .27)
}

document.addEventListener('keydown', event => {
  if (!event.repeat && event.code === 'Escape') {
    if (mode === 'pause') activate()
    else pause()
    return
  }
  const interactive = event.target instanceof HTMLElement && event.target.closest('button, a, input, select, textarea')
  if (!event.repeat && event.code === 'Enter' && mode !== 'play' && !interactive) {
    event.preventDefault()
    activate()
    return
  }
  if (mode !== 'play' || !controls.has(event.code)) return
  event.preventDefault()
  keys.add(event.code)
  if (!event.repeat) queue(event.code)
})
document.addEventListener('keyup', event => keys.delete(event.code))
window.addEventListener('blur', () => {
  clearInput()
  pause()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause()
    stopLoop()
  } else if (mode === 'play') startLoop()
})
for (const button of document.querySelectorAll('[data-key]')) {
  const { key } = button.dataset
  button.addEventListener('pointerdown', event => {
    if (mode !== 'play' || event.button !== 0) return
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    touches.set(event.pointerId, key)
    queue(key)
  })
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(event, pointer => touches.delete(pointer.pointerId))
  }
}
cabinet.tabIndex = -1
ui.start.addEventListener('click', activate)
ui.pause.addEventListener('click', pause)
ui.mute?.addEventListener('click', () => {
  muted = !muted
  ui.mute.setAttribute('aria-pressed', String(muted))
  ui.mute.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
  if (gain) gain.gain.setTargetAtTime(muted ? 0 : .23, audio.currentTime, .015)
  if (!muted && mode === 'play') enableAudio()
})

const step = 1 / 60
let request = 0, last = 0, accumulator = 0

function startLoop() {
  if (document.hidden || request) return
  last = performance.now()
  accumulator = 0
  request = requestAnimationFrame(frame)
}

function stopLoop() {
  cancelAnimationFrame(request)
  request = 0
}

function frame(now) {
  request = 0
  accumulator += clamp((now - last) / 1000, 0, .1)
  last = now
  while (mode === 'play' && accumulator >= step) {
    update(step)
    accumulator -= step
  }
  draw()
  if (mode === 'play' && !document.hidden) request = requestAnimationFrame(frame)
}

draw()
