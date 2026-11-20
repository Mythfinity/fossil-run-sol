const WIDTH = 480
const HEIGHT = 270
const palettes = [
  {
    sky: ['#2a2a49', '#573e5b', '#a5545c', '#e37963', '#ffb16e', '#ffd68d'],
    cloud: '#ffd993', haze: '#b86264', ridge: '#7b4754', mesa: '#593e50',
    scrub: '#293634', foliage: '#284642', lightLeaf: '#436052',
    road: '#394148', roadLight: '#59605a', paint: '#aa906b', verge: '#8b694d',
  },
  {
    sky: ['#263446', '#355151', '#4c6960', '#6c8e73', '#a6a97b', '#d0bd86'],
    cloud: '#ecdb9d', haze: '#6b826e', ridge: '#425b57', mesa: '#314d47',
    scrub: '#183d38', foliage: '#1e4a41', lightLeaf: '#376b53',
    road: '#334744', roadLight: '#536652', paint: '#93a679', verge: '#6b7960',
  },
  {
    sky: ['#192137', '#282942', '#3f3350', '#5e3c56', '#89546b', '#cb746e'],
    cloud: '#f8a694', haze: '#79526a', ridge: '#56415c', mesa: '#373b50',
    scrub: '#21303b', foliage: '#233c45', lightLeaf: '#356069',
    road: '#353e49', roadLight: '#4a5661', paint: '#82919b', verge: '#80696d',
  },
]

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function brushes(ctx) {
  function box(x, y, width, height, color) {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), width, height)
  }
  function poly(color, ...points) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(...points[0])
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y)
    ctx.fill()
  }
  function ellipse(x, y, rx, ry, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  return { ctx, box, poly, ellipse }
}

function drawSky({ box, ellipse, poly }, colors, sector, random) {
  const { sky, cloud, haze, ridge, mesa } = colors
  for (const [i, color] of sky.entries()) box(0, i * 22, WIDTH, 23, color)
  for (let i = 0; i < 195; i++) {
    const y = 13 + Math.floor(random() * 116)
    box(random() * WIDTH, y, 2 + Math.floor(random() * 10), 1, i % 3 ? '#f9bc8424' : '#311c3c24')
  }

  const sunX = sector === 1 ? 299 : 369
  const sunY = sector === 2 ? 78 : 65
  const sunR = sector === 1 ? 34 : 43
  ellipse(sunX, sunY, sunR + 8, sunR + 8, '#ffe0a323')
  ellipse(sunX, sunY, sunR, sunR, cloud)
  for (let i = 0; i < 6; i++) {
    const offset = 7 + i * 6
    if (offset >= sunR) break
    const half = Math.floor(Math.sqrt(sunR * sunR - offset * offset))
    box(sunX - half, sunY + offset, half * 2, 1 + Number(i > 2), sky[4])
  }

  for (let i = 0; i < 15; i++) {
    const x = random() * WIDTH
    const y = 44 + random() * 67
    const w = 12 + Math.floor(random() * 42)
    box(x, y, w, 2, '#fbc49139')
    box(x + w * .3, y + 3, w * .44, 1, '#ffc99b49')
  }

  poly(haze, [0, 111], [34, 91], [69, 98], [103, 82], [127, 87], [182, 118],
    [222, 108], [254, 85], [274, 93], [288, 80], [329, 96], [353, 115],
    [409, 101], [456, 85], [480, 91], [480, 151], [0, 151])
  poly(ridge, [0, 133], [54, 121], [84, 127], [131, 110], [157, 111], [175, 94],
    [198, 98], [215, 122], [252, 127], [295, 103], [319, 102], [351, 136],
    [391, 131], [426, 106], [459, 106], [480, 120], [480, 162], [0, 162])
  poly(mesa, [0, 142], [36, 136], [53, 118], [69, 117], [74, 104], [102, 105],
    [107, 117], [132, 121], [173, 143], [205, 135], [232, 143], [262, 133],
    [303, 144], [341, 132], [381, 143], [433, 132], [480, 143], [480, 171], [0, 171])
  poly('#f5a36e33', [55, 121], [74, 106], [88, 106], [84, 111], [72, 124], [62, 130])
  poly('#221f332f', [91, 108], [101, 107], [106, 119], [130, 123], [159, 139],
    [116, 137], [99, 129])
  for (const [x, y] of [[331, 78], [349, 69], [369, 82]]) {
    poly(ridge, [x - 8, y - 5], [x - 3, y - 3], [x, y], [x + 4, y - 4],
      [x + 9, y - 5], [x + 4, y - 1], [x + 1, y + 3], [x - 1, y + 2],
      [x - 4, y - 1])
  }
}

function tree({ ctx, box, poly, ellipse }, colors, x, y, size, variation) {
  ctx.save()
  ctx.translate(Math.round(x), y)
  ctx.scale(size, size)
  poly('#142c2f', [-11, 2], [-4, -21], [-4, -50], [-14, -65], [-9, -68], [2, -57],
    [10, -77], [15, -78], [9, -54], [10, -8], [17, 2])
  poly(colors.foliage, [-6, 0], [1, -15], [1, -52], [7, -59], [5, -34], [6, -6])
  for (const [x, y, width] of [[-25, -61, 35], [-11, -77, 39], [25, -75, 29], [33, -59, 27]]) {
    ellipse(x, y + variation, width, 12, colors.scrub)
    ellipse(x + 2, y - 3 + variation, width * .87, 8, colors.foliage)
    box(x - width * .59, y - 7 + variation, width * .8, 1, colors.lightLeaf)
  }
  ctx.restore()
}

function fence({ box, poly }, colors, sector) {
  box(0, 142, WIDTH, 33, colors.scrub)
  box(0, 153, WIDTH, 2, '#192b31')
  for (let x = 5; x < WIDTH; x += 27) {
    box(x, 149, 2, 18, '#17262d')
    box(x + 2, 150, 1, 15, '#6f7770')
    if (sector === 2) box(x + 3, 155, 24, 1, '#6cd3c444')
  }
  if (sector !== 1) return
  poly('#1c3435', [233, 151], [242, 121], [251, 118], [351, 116], [364, 124],
    [374, 151], [356, 154], [348, 131], [253, 133], [246, 153])
  poly('#829180', [244, 123], [251, 118], [351, 116], [355, 119], [350, 125],
    [251, 127], [244, 129])
  box(261, 118, 82, 4, '#bdb994')
  box(253, 128, 100, 4, '#43584b')
  for (let i = 0; i < 11; i++) {
    const x = 239 + i * 11
    box(x, 119, 2, 9 + i % 4 * 3, i % 2 ? '#557958' : '#476b50')
    box(x + 2, 124 + i % 3, 6, 3, '#557958')
  }
}

function depot({ box, poly }) {
  const outline = '#142932'
  box(260, 142, 200, 28, outline)
  poly(outline, [280, 146], [293, 122], [413, 122], [447, 147])
  box(297, 128, 117, 16, '#273d49')
  box(290, 129, 132, 2, '#5a6470')
  box(332, 131, 67, 4, '#14343b')
  box(334, 132, 63, 2, '#6ce0c4')
  box(288, 145, 155, 2, '#5d7783')
  for (const x of [292, 354, 415]) {
    box(x, 150, 32, 16, '#3b4951')
    box(x + 3, 151, 26, 2, '#d1ab74')
    box(x + 4, 157, 24, 2, '#121d2a')
  }
  for (const x of [255, 451]) {
    box(x, 107, 4, 58, '#152932')
    box(x + 3, 107, 1, 58, '#547079')
    box(x - 6, 105, 16, 3, '#245261')
    box(x - 5, 108, 14, 2, '#a4efce')
  }
}

function road({ box, poly }, colors, random, sector) {
  box(0, 169, WIDTH, 101, colors.road)
  box(0, 169, WIDTH, 4, '#202c32')
  box(0, 173, WIDTH, 2, colors.verge)
  box(0, 178, WIDTH, 1, colors.paint)
  for (let i = 0; i < 310; i++) {
    const x = Math.floor(random() * WIDTH)
    const y = 180 + Math.floor(random() * 73)
    const width = 1 + Math.floor(random() * (4 + (y - 180) / 11))
    box(x, y, width, 1, i % 5 ? '#27333b45' : '#d5c5a336')
  }
  for (let x = 8; x < WIDTH; x += 74) {
    const y = 221
    poly(colors.roadLight, [x, y - 1], [x + 33, y - 1], [x + 30, y + 1], [x - 3, y + 1])
    box(x + 4, y - 1, 18, 1, colors.paint)
  }
  for (let i = 0; i < 20; i++) {
    const x = random() * WIDTH, y = 178 + random() * 78
    box(x, y, 5, 1, '#232c31')
    box(x + 4, y + 1, 6, 1, '#232c31')
    box(x + 9, y + 2, 9, 1, '#232c31')
  }
  box(0, 253, WIDTH, 1, colors.roadLight)
  box(0, 256, WIDTH, 2, colors.paint)
  box(0, 261, WIDTH, 9, '#27362e')
  for (let i = 0; i < 70; i++) {
    const x = random() * WIDTH
    const y = 261 + random() * 9
    box(x, y, 1 + Math.floor(random() * 4), 2, i % 2 ? colors.verge : colors.foliage)
  }
  if (sector === 2) {
    for (let i = 0; i < 10; i++) box(407 + i * 6, 182, 3, 2, '#79c8a4')
  }
}

function car({ ctx, box, poly, ellipse }, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size, size)
  ellipse(59, 3, 68, 4, '#152734c4')
  poly('#17272d', [-5, -6], [-5, -23], [11, -14], [40, -23], [58, -43], [91, -43],
    [106, -25], [122, -22], [130, -15], [129, -4], [121, 0], [-5, 0])
  poly('#4c917f', [-2, -10], [-2, -19], [12, -12], [42, -21], [59, -41], [90, -41],
    [105, -23], [121, -20], [126, -15], [127, -7], [117, -4], [-2, -4])
  poly('#acf2c8', [-1, -17], [12, -11], [43, -20], [60, -40], [87, -40], [101, -23],
    [83, -24], [56, -16], [103, -20], [122, -16], [65, -11], [8, -7], [0, -9])
  poly('#213944', [49, -21], [61, -37], [75, -37], [75, -23])
  poly('#243b49', [78, -37], [88, -37], [98, -25], [78, -24])
  poly('#76999a', [54, -26], [62, -36], [68, -36], [59, -26])
  box(70, -19, 9, 2, '#3f665b')
  box(115, -17, 11, 4, '#ffde82')
  box(-4, -14, 7, 4, '#ed775b')
  box(-7, -7, 15, 3, '#bec5ac')
  box(118, -7, 14, 3, '#dce0bf')
  for (const wheel of [18, 108]) {
    ellipse(wheel, -1, 12, 11, '#12222a')
    ellipse(wheel, -1, 8, 8, '#c2bda3')
    ellipse(wheel, -1, 5, 5, '#42575a')
    box(wheel - 1, -2, 2, 2, '#dcddbe')
  }
  ctx.restore()
}

function makeBackground(sector, attract) {
  const surface = document.createElement('canvas')
  surface.width = WIDTH
  surface.height = HEIGHT
  const art = brushes(surface.getContext('2d'))
  const colors = palettes[sector]
  const random = randomGenerator(45206 + sector)
  drawSky(art, colors, sector, random)
  fence(art, colors, sector)
  if (sector === 0) {
    tree(art, colors, 63, 168, .7, -3)
    tree(art, colors, 472, 171, .94, 7)
  }
  if (sector === 1) {
    tree(art, colors, 36, 173, 1.49, -6)
    tree(art, colors, 122, 171, .67, 4)
    tree(art, colors, 438, 172, 1.35, 2)
  }
  if (sector === 2) depot(art)
  road(art, colors, random, sector)
  if (attract) car(art, 306, 176, 1.05)
  if (sector === 2) car(art, 385, 168, .59)
  return surface
}

function ranger({ box, poly }, a, player, stride, bob) {
  const outline = '#14262c'
  const dark = player ? '#255558' : '#4f2b3c'
  const mid = player ? '#338c7f' : '#a3484f'
  const light = a.windup > 0 ? '#ffae6e' : player ? '#7bdfb5' : '#e5a16d'
  const skin = player ? '#e5a06c' : '#b87c67'
  const bright = a.hurt > 0 ? '#fff4ca' : light

  if (a.action === 'roll') {
    poly(outline, [-19, -4], [-23, -12], [-18, -23], [-3, -26], [12, -22],
      [19, -14], [18, -7], [11, -2])
    poly(mid, [-18, -11], [-15, -21], [-1, -24], [11, -19], [5, -11], [-6, -8])
    box(-13, -19, 14, 3, bright)
    box(5, -14, 12, 8, skin)
    box(12, -17, 5, 3, light)
    box(-9, -7, 17, 4, dark)
    return
  }

  box(-10 - stride, -19, 9, 16, outline)
  box(-8 - stride, -18, 5, 13, '#2e4448')
  box(2 + stride, -17, 9, 14, outline)
  box(3 + stride, -16, 6, 12, '#485959')
  box(-13 - stride, -5, 13, 5, outline)
  box(1 + stride, -5, 14, 5, outline)
  box(8 + stride, -4, 5, 1, '#77918a')

  poly(outline, [-13, -40 + bob], [-6, -44 + bob], [7, -44 + bob], [13, -38 + bob],
    [14, -20], [8, -17], [-11, -18], [-15, -28])
  poly(mid, [-11, -39 + bob], [-6, -42 + bob], [6, -41 + bob], [11, -36 + bob],
    [10, -22], [-9, -20], [-13, -29])
  poly(bright, [-10, -38 + bob], [-4, -41 + bob], [5, -40 + bob], [10, -36 + bob],
    [5, -36 + bob], [1, -31 + bob], [-8, -32 + bob])
  box(-9, -24, 19, 4, dark)
  box(2, -24, 4, 3, '#e7bc70')

  box(-7, -55 + bob, 16, 14, outline)
  box(-4, -53 + bob, 12, 10, skin)
  if (player) {
    box(-7, -57 + bob, 15, 7, dark)
    box(-7, -57 + bob, 11, 2, bright)
    box(-9, -51 + bob, 23, 3, outline)
    box(4, -48 + bob, 3, 2, outline)
  } else {
    box(-7, -55 + bob, 16, 4, light)
    box(-6, -48 + bob, 16, 4, dark)
    box(5, -50 + bob, 3, 2, '#f9d778')
  }
  box(-14, -36 + bob, 6, 14, dark)
  const striking = a.action === 'strike' || a.action === 'wave'
  const reach = striking ? 22 + (a.combo || 0) * 3 : 8
  const fistY = -34 + bob - (a.action === 'wave' ? 5 : 0)
  box(6, fistY - 1, reach, 9, outline)
  box(7, fistY, reach - 1, 6, mid)
  box(reach, fistY, 7, 6, skin)
  box(reach, fistY, 6, 2, bright)
}

function dinosaur({ box, poly }, a, stride, bob) {
  const alpha = a.kind === 'alpha'
  const outline = '#1a292e'
  const mid = alpha ? '#af6053' : '#629564'
  const light = alpha ? '#f79870' : '#a7d988'
  const dark = alpha ? '#693f48' : '#385c58'
  const bright = a.hurt > 0 ? '#fff2b7' : a.windup > 0 || a.enraged ? '#ffb668' : light
  const crouch = a.attackType === 'lunge' && a.windup > 0 ? 4 : 0
  const head = bob + crouch
  const jaw = a.windup > 0 ? 5 : 0
  poly(outline, [-15, -12], [-27, -13], [-39, -23], [-51, -37 + bob],
    [-38, -31], [-25, -27], [-9, -25])
  poly(dark, [-12, -15], [-26, -17], [-38, -25], [-47, -34 + bob], [-33, -29], [-9, -24])
  poly(outline, [-17, -24], [-11, -31], [0, -35], [9, -47 + head], [24, -47 + head],
    [32, -40 + head], [39, -36 + head], [38, -28 + head], [29, -24 + head],
    [21, -27 + head], [12, -20], [5, -13], [-13, -13])
  poly(mid, [-15, -23], [-9, -29], [1, -33], [11, -44 + head], [24, -45 + head],
    [30, -39 + head], [36, -36 + head], [35, -30 + head], [25, -29 + head], [14, -24], [6, -16], [-12, -16])
  poly(bright, [-9, -29], [2, -33], [12, -44 + head], [23, -44 + head], [27, -41 + head],
    [13, -40 + head], [8, -32], [1, -27], [-9, -24])
  poly(dark, [-16, -24], [-7, -24], [-9, -19], [-14, -18])
  box(17, -40 + head, 7, 3, outline)
  box(19, -40 + head, 3, 2, '#ffe28a')
  box(21, -32 + head, 17, 4 + jaw, outline)
  box(24, -29 + head + jaw, 12, 3, mid)
  for (const x of [25, 29, 33]) box(x, -32 + head, 2, 3, '#fff1c5')
  for (const x of [-10, -4, 2, 8]) box(x, -26 + x % 3, 2, 2, dark)
  box(9, -24, 12, 4, dark)
  box(18, -22, 4, 4, light)
  poly(dark, [-11, -18], [-5, -19], [-10 + stride, -8], [-16 + stride, -5], [-7 + stride, -4],
    [-9 + stride, 0], [-20 + stride, -1], [-20 + stride, -7])
  poly(outline, [-1, -20], [8, -19], [5 - stride, -12], [-1 - stride, -8], [8 - stride, -5],
    [9 - stride, -1], [-5 - stride, 0], [-7 - stride, -6], [-3, -13])
  poly(mid, [1, -19], [6, -18], [3 - stride, -12], [-3 - stride, -7], [6 - stride, -4],
    [-4 - stride, -3], [-5 - stride, -6])
  box(4 - stride, -3, 5, 2, '#ddd1a4')
}

export function createPainter(canvas) {
  const art = brushes(canvas.getContext('2d'))
  const { ctx, ellipse } = art
  const backgrounds = new Map()

  function scenery(sector, attract) {
    const key = attract ? 'attract' : sector
    if (!backgrounds.has(key)) backgrounds.set(key, makeBackground(sector, attract))
    ctx.drawImage(backgrounds.get(key), 0, 0)
  }

  function fighter(actor, time, player) {
    const raptor = actor.kind === 'raptor' || actor.kind === 'alpha'
    const scale = actor.kind === 'alpha' ? 1.38 : raptor ? .95 : 1
    const phase = time * (raptor ? 19 : 17) + actor.x * .04
    const stride = actor.moving ? Math.round(Math.sin(phase) * 5) : 0
    const bob = actor.moving ? -Math.floor(Math.abs(Math.sin(phase)) * 3) : 0
    ellipse(actor.x, actor.y + 1, (raptor ? 27 : 15) * scale, 4 * scale, '#131d2580')
    ctx.save()
    ctx.translate(Math.round(actor.x), Math.round(actor.y))
    ctx.scale((actor.face || 1) * scale, scale)
    if (raptor) dinosaur(art, actor, stride, bob)
    else ranger(art, actor, player, stride, bob)
    ctx.restore()
  }

  return { ...art, scenery, fighter }
}
