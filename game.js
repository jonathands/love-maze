// ══════════════════════════════════════════════════════════════
//  CONFIG — edit this object to customise the game and win screen
// ══════════════════════════════════════════════════════════════
var CONFIG = {
  seed:     null,
  title:    'Vc achou o tesouro 💎',
  message:  'Muito obrigado por tudo meu amor,\nsempre estaremos juntos 💕',
  imageSrc: 'amore.jpg',
};

// ══════════════════════════════════════════════════════════════
//  ATTACKS — one entry per selectable character
//  Each defines the visual, particle, and mechanic for the attack.
//
//  mechanic:
//    'contact'  – player walks onto enemy cell          (Knight, Paladin)
//    'adjacent' – player fires from 1 cell away         (Mage)
//    'ranged'   – player fires from 2 cells in a line   (Archer, falls back to contact)
// ══════════════════════════════════════════════════════════════
var ATTACKS = {
  '⚔️': {
    label:     '⚔️ Golpe de Espada!',
    labelColor:'#c8d0e0',
    cellAnim:  'explode-slash',
    cellEmoji: '💥',
    pool:      ['⚔️','💥','✨','🗡️','💫'],
    count:     14,
    duration:  420,
    mechanic:  'contact',
    // Broad sword sweep perpendicular to movement
    makeParticles: function (i, n, cx, cy, dr, dc) {
      var base  = Math.atan2(dc, dr) + Math.PI / 2;
      var angle = base - 0.6 * Math.PI + (i / (n - 1)) * Math.PI * 1.2;
      var dist  = 55 + Math.random() * 65;
      return { x: cx, y: cy, ex: Math.cos(angle) * dist, ey: Math.sin(angle) * dist };
    }
  },
  '🧙': {
    label:     '🔮 Explosão Mágica!',
    labelColor:'#c060ff',
    cellAnim:  'explode-burst',
    cellEmoji: '🔮',
    pool:      ['🔮','✨','⭐','💫','🌟','🪄'],
    count:     18,
    duration:  680,
    mechanic:  'adjacent',   // Mage stays 1 cell back, fires spell
    // Full circular burst, large radius
    makeParticles: function (i, n, cx, cy, dr, dc) {
      var angle = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      var dist  = 85 + Math.random() * 85;
      return { x: cx, y: cy, ex: Math.cos(angle) * dist, ey: Math.sin(angle) * dist };
    }
  },
  '🏹': {
    label:     '🏹 Flecha Certeira!',
    labelColor:'#60d080',
    cellAnim:  'explode-arrow',
    cellEmoji: '🎯',
    pool:      ['🏹','💨','✨','🎯','💥'],
    count:     8,
    duration:  260,
    mechanic:  'ranged',     // shoots from 2 cells in same row/col
    // Tight directional cone
    makeParticles: function (i, n, cx, cy, dr, dc) {
      var base  = Math.atan2(dr, dc);
      var angle = base + (Math.random() - 0.5) * 0.6;
      var dist  = 75 + Math.random() * 90;
      return { x: cx, y: cy, ex: Math.cos(angle) * dist, ey: Math.sin(angle) * dist };
    }
  },
  '🛡️': {
    label:     '✨ Luz Divina!',
    labelColor:'#ffd040',
    cellAnim:  'explode-holy',
    cellEmoji: '✨',
    pool:      ['✨','🌟','💛','⚡','🔱','💫'],
    count:     14,
    duration:  750,
    mechanic:  'contact',    // contact + AoE flash on neighbours
    // Particles fall from above target position
    makeParticles: function (i, n, cx, cy, dr, dc) {
      var sx  = cx + (Math.random() - 0.5) * 110;
      var sy  = cy - 70 - Math.random() * 60;
      var ex  = cx + (Math.random() - 0.5) * 60;
      var ey  = cy + 20 + Math.random() * 50;
      return { x: sx, y: sy, ex: ex - sx, ey: ey - sy };
    }
  }
};

(function () {
  'use strict';

  var ROWS = 15, COLS = 13;
  var START_R = 1, START_C = 1;
  var GOAL_R  = ROWS - 2, GOAL_C = COLS - 2;

  // ── Seeded PRNG (mulberry32) ─────────────────────────────────
  function createRNG(seed) {
    var s = seed >>> 0;
    return function () {
      s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Maze generation (recursive backtracker DFS) ──────────────
  function generateMaze(seed) {
    var rng = createRNG(seed);
    var grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) grid[r][c] = 1;
    }
    var vis = {};
    function key(r, c) { return r * 100 + c; }
    function dfs(r, c) {
      grid[r][c] = 0; vis[key(r, c)] = true;
      var dirs = [[-2,0],[2,0],[0,-2],[0,2]];
      for (var i = dirs.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
      }
      for (var d = 0; d < dirs.length; d++) {
        var nr = r + dirs[d][0], nc = c + dirs[d][1];
        if (nr > 0 && nr < ROWS-1 && nc > 0 && nc < COLS-1 && !vis[key(nr,nc)]) {
          grid[r + dirs[d][0]/2][c + dirs[d][1]/2] = 0;
          dfs(nr, nc);
        }
      }
    }
    dfs(START_R, START_C);

    // BFS from start to goal to find the solution path
    var bfsQ   = [[START_R, START_C]];
    var bfsPrev = {};
    bfsPrev[START_R * 100 + START_C] = null;
    var dirs4 = [[-1,0],[1,0],[0,-1],[0,1]];
    outer: while (bfsQ.length) {
      var cur = bfsQ.shift();
      for (var d4 = 0; d4 < 4; d4++) {
        var br = cur[0] + dirs4[d4][0], bc = cur[1] + dirs4[d4][1];
        var bk = br * 100 + bc;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS && grid[br][bc] === 0 && !(bk in bfsPrev)) {
          bfsPrev[bk] = cur;
          if (br === GOAL_R && bc === GOAL_C) break outer;
          bfsQ.push([br, bc]);
        }
      }
    }
    // Reconstruct path (array of [r,c] from start to goal)
    var path = [], step = [GOAL_R, GOAL_C];
    while (step) { path.unshift(step); step = bfsPrev[step[0] * 100 + step[1]]; }

    // Pick enemy from the middle 25%–70% of the path (never at start or goal)
    var lo = Math.max(1, Math.floor(path.length * 0.25));
    var hi = Math.min(path.length - 2, Math.floor(path.length * 0.70));
    var pick = path[lo + Math.floor(rng() * (hi - lo + 1))];
    return { grid: grid, enemyR: pick[0], enemyC: pick[1] };
  }

  // ── State ───────────────────────────────────────────────────
  var MAZE = [];
  var currentSeed = (CONFIG.seed != null)
    ? CONFIG.seed
    : (Math.floor(Math.random() * 99998) + 1);
  var selectedChar = '⚔️';
  var pR, pC, eR, eC;
  var moves = 0, seconds = 0;
  var timerID = null, won = false;
  var visited = new Set();
  var lives = 3;
  var enemyWeak = false;
  var blocked = false;

  // ── DOM ─────────────────────────────────────────────────────
  var mazeEl       = document.getElementById('maze');
  var mazeWrap     = document.getElementById('maze-wrap');
  var movesEl      = document.getElementById('moves');
  var timerEl      = document.getElementById('timer');
  var heroDisplay  = document.getElementById('hero-display');
  var hintEl       = document.getElementById('hint-text');
  var winScreen    = document.getElementById('win-screen');
  var charScreen   = document.getElementById('char-screen');
  var fMovesEl     = document.getElementById('f-moves');
  var fTimeEl      = document.getElementById('f-time');
  var lovePhoto    = document.getElementById('love-photo');
  var placeholder  = document.getElementById('photo-placeholder');
  var seedInput    = document.getElementById('seed-input');
  var charSeedInput= document.getElementById('char-seed-input');
  var livesEl      = document.getElementById('lives-display');
  var loseScreen   = document.getElementById('lose-screen');

  // ── Touch detection ──────────────────────────────────────────
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) {
    document.body.classList.add('is-touch');
    hintEl.textContent = 'Use os botões ou deslize na tela  |  empurre o inimigo para atacar';
  }

  // ── Win screen content from CONFIG ───────────────────────────
  document.getElementById('win-title').textContent   = CONFIG.title;
  document.getElementById('win-message').innerHTML   = CONFIG.message.replace(/\n/g, '<br>');
  if (CONFIG.imageSrc && CONFIG.imageSrc.trim() !== '') {
    lovePhoto.src = CONFIG.imageSrc;
    lovePhoto.style.display   = 'block';
    placeholder.style.display = 'none';
  } else {
    lovePhoto.style.display   = 'none';
    placeholder.style.display = 'flex';
  }

  // ── Character select ─────────────────────────────────────────
  function showCharScreen() {
    charSeedInput.value = currentSeed;
    charScreen.classList.remove('fade-out');
    charScreen.classList.add('open');
    charScreen.querySelectorAll('.char-card').forEach(function (c) {
      c.classList.toggle('selected', c.dataset.emoji === selectedChar);
    });
  }

  function hideCharScreen(cb) {
    charScreen.classList.add('fade-out');
    setTimeout(function () { charScreen.classList.remove('open', 'fade-out'); if (cb) cb(); }, 360);
  }

  charScreen.querySelectorAll('.char-card').forEach(function (card) {
    card.addEventListener('click', function () {
      charScreen.querySelectorAll('.char-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      selectedChar = card.dataset.emoji;
      heroDisplay.textContent = selectedChar;
      var sv = parseInt(charSeedInput.value, 10);
      if (!isNaN(sv) && sv >= 1) currentSeed = Math.min(99999, sv);
      setTimeout(function () { hideCharScreen(function () { newGame(currentSeed); }); }, 220);
    });
  });

  document.getElementById('char-btn-new-seed').addEventListener('click', function () {
    charSeedInput.value = Math.floor(Math.random() * 99998) + 1;
  });

  // ── New game ─────────────────────────────────────────────────
  function newGame(seed) {
    seed = Math.max(1, Math.min(99999, seed | 0)) || 1;
    currentSeed = seed;
    seedInput.value = seed;
    var result = generateMaze(seed);
    MAZE = result.grid; eR = result.enemyR; eC = result.enemyC;
    heroDisplay.textContent = selectedChar;
    pR = START_R; pC = START_C;
    moves = 0; seconds = 0; won = false;
    lives = 3; enemyWeak = false; blocked = false;
    clearInterval(timerID); timerID = null;
    movesEl.textContent = '0'; timerEl.textContent = '0s';
    visited.clear();
    updateLives();
    winScreen.querySelectorAll('.win-rain').forEach(function (el) { el.remove(); });
    winScreen.classList.remove('open');
    loseScreen.classList.remove('open');
    buildGrid();
  }

  // ── Cell size ────────────────────────────────────────────────
  var RESERVED_H = 350;
  function computeCellPx() {
    var availH = window.innerHeight - RESERVED_H;
    var availW = window.innerWidth  - 16;
    return Math.max(24, Math.min(68, Math.min(Math.floor(availH / ROWS), Math.floor(availW / COLS))));
  }

  function buildGrid() {
    var px = computeCellPx();
    document.documentElement.style.setProperty('--cell', px + 'px');
    mazeEl.style.gridTemplateColumns = 'repeat(' + COLS + ', ' + px + 'px)';
    mazeEl.style.gridTemplateRows    = 'repeat(' + ROWS + ', ' + px + 'px)';
    mazeEl.innerHTML = '';
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var div = document.createElement('div');
        div.className = 'cell ' + (MAZE[r][c] ? 'wall' : 'path');
        div.id = 'c' + r + '_' + c;
        mazeEl.appendChild(div);
      }
    }
    render();
  }

  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(buildGrid, 120); });

  function getCell(r, c) { return document.getElementById('c' + r + '_' + c); }

  // ── Proximity check ──────────────────────────────────────────
  function canAttackFrom(r, c) {
    if (eR === -1) return false;
    var atk = ATTACKS[selectedChar] || ATTACKS['⚔️'];
    var manDist = Math.abs(r - eR) + Math.abs(c - eC);
    if (atk.mechanic === 'ranged') {
      // 2 cells in same row/col with clear middle
      if (r === eR && Math.abs(c - eC) === 2 && MAZE[r][(c + eC) / 2] === 0) return true;
      if (c === eC && Math.abs(r - eR) === 2 && MAZE[(r + eR) / 2][c] === 0) return true;
    }
    // adjacent triggers for all mechanics
    return manDist === 1;
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    var ready = canAttackFrom(pR, pC);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) continue;
        var el = getCell(r, c);
        if (r === pR && c === pC) {
          el.className = 'cell path ' + (ready ? 'cell-player-ready' : 'cell-player');
          el.textContent = selectedChar;
        } else if (r === eR && c === eC) {
          el.className = 'cell path cell-enemy' + (enemyWeak ? ' enemy-weak' : '');
          el.textContent = '💀';
        } else if (r === GOAL_R && c === GOAL_C) {
          el.className = 'cell path cell-treasure';
          el.textContent = '🎁';
        } else {
          el.className = 'cell ' + (visited.has(r * COLS + c) ? 'visited' : 'path');
          el.textContent = '';
        }
      }
    }
  }

  // ── Attack enemy ─────────────────────────────────────────────
  function attackEnemy(r, c, dr, dc) {
    var atk = ATTACKS[selectedChar] || ATTACKS['⚔️'];
    var el  = getCell(r, c);
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width  / 2;
    var cy = rect.top  + rect.height / 2;

    // Cell flash
    el.textContent = atk.cellEmoji;
    el.className = 'cell path cell-' + atk.cellAnim;
    setTimeout(function () { el.textContent = ''; el.className = 'cell path'; }, atk.duration + 60);

    // Floating label
    var lbl = document.createElement('div');
    lbl.className = 'attack-label';
    lbl.textContent = atk.label;
    lbl.style.color = atk.labelColor;
    lbl.style.left  = cx + 'px';
    lbl.style.top   = (cy - 10) + 'px';
    document.body.appendChild(lbl);
    setTimeout(function () { lbl.remove(); }, 1100);

    // Particles
    for (var i = 0; i < atk.count; i++) {
      (function (idx) {
        var p = atk.makeParticles(idx, atk.count, cx, cy, dr, dc);
        var part = document.createElement('div');
        part.className = 'expl-particle';
        part.textContent = atk.pool[idx % atk.pool.length];
        part.style.left  = p.x + 'px';
        part.style.top   = p.y + 'px';
        part.style.setProperty('--ex', p.ex + 'px');
        part.style.setProperty('--ey', p.ey + 'px');
        part.style.animationDuration  = (atk.duration / 1000 + 0.1) + 's';
        part.style.animationDelay     = (Math.random() * 55) + 'ms';
        document.body.appendChild(part);
        setTimeout(function () { part.remove(); }, atk.duration + 200);
      }(i));
    }

    // Paladin AoE — flash neighbouring cells
    if (selectedChar === '🛡️') {
      var adj = [[-1,0],[1,0],[0,-1],[0,1]];
      for (var a = 0; a < adj.length; a++) {
        var ar2 = r + adj[a][0], ac2 = c + adj[a][1];
        if (ar2 >= 0 && ar2 < ROWS && ac2 >= 0 && ac2 < COLS && MAZE[ar2][ac2] === 0) {
          (function (r2, c2) {
            var ae = getCell(r2, c2);
            ae.classList.add('cell-holy-aoe');
            setTimeout(function () { ae.classList.remove('cell-holy-aoe'); }, 750);
          }(ar2, ac2));
        }
      }
    }

    eR = -1; eC = -1;
  }

  // ── Lives display ────────────────────────────────────────────
  function updateLives() {
    livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
  }

  // ── Enemy counterattack — first encounter ────────────────────
  function enemyCounterattack() {
    blocked = true;
    enemyWeak = true;
    lives--;
    updateLives();

    // ── Phase 1: impact at player's current position ─────────────
    // Enemy cell flashes red
    var enemyEl = getCell(eR, eC);
    enemyEl.classList.add('cell-enemy-strike');
    setTimeout(function () { enemyEl.classList.remove('cell-enemy-strike'); }, 500);

    // Floating label rising from enemy
    var rect = enemyEl.getBoundingClientRect();
    var lbl = document.createElement('div');
    lbl.className = 'attack-label';
    lbl.textContent = '💀 Ataque Inimigo!';
    lbl.style.color = '#ff3300';
    lbl.style.left  = (rect.left + rect.width  / 2) + 'px';
    lbl.style.top   = (rect.top  + rect.height / 2 - 10) + 'px';
    document.body.appendChild(lbl);
    setTimeout(function () { lbl.remove(); }, 1100);

    // Red viewport flash
    document.body.classList.add('player-hit');
    setTimeout(function () { document.body.classList.remove('player-hit'); }, 450);

    // Player shakes in place
    var playerEl = getCell(pR, pC);
    playerEl.classList.add('cell-player-stunned');

    // ── Phase 2 (~520ms): dissolve from old cell, pop into start ──
    setTimeout(function () {
      pR = START_R; pC = START_C;
      render();

      // Bounce-in animation on the start cell
      var startEl = getCell(START_R, START_C);
      startEl.classList.add('cell-player-arrive');
      setTimeout(function () { startEl.classList.remove('cell-player-arrive'); }, 460);

      // Unblock input after arrival settles
      setTimeout(function () { blocked = false; }, 460);

      if (lives <= 0) {
        setTimeout(triggerGameOver, 600);
      } else {
        showRetryMessage();
      }
    }, 520);
  }

  // ── "TENTE DE NOVO!" overlay message ─────────────────────────
  function showRetryMessage() {
    var msg = document.createElement('div');
    msg.className = 'retry-message';
    msg.textContent = 'TENTE DE NOVO!';
    document.body.appendChild(msg);
    setTimeout(function () { msg.remove(); }, 1800);
  }

  // ── Game over ────────────────────────────────────────────────
  function triggerGameOver() {
    won = true;
    clearInterval(timerID);
    loseScreen.classList.add('open');
  }

  // ── Move ────────────────────────────────────────────────────
  function move(dr, dc) {
    if (won || blocked) return;
    var nr = pR + dr, nc = pC + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (MAZE[nr][nc] === 1) return;

    var atk = ATTACKS[selectedChar] || ATTACKS['⚔️'];

    if (eR !== -1) {
      // Detect whether this move is an attack attempt
      var isAttack = false;
      if (atk.mechanic === 'ranged') {
        var ar = pR + dr * 2, ac = pC + dc * 2;
        if (ar === eR && ac === eC && MAZE[pR + dr][pC + dc] === 0) isAttack = true;
      }
      if (!isAttack && nr === eR && nc === eC) isAttack = true;

      if (isAttack) {
        if (!enemyWeak) {
          // First encounter: enemy wins — send player back
          enemyCounterattack();
          return;
        }

        // Enemy is weak: resolve normally per mechanic
        if (atk.mechanic === 'ranged') {
          attackEnemy(eR, eC, dr, dc);
          visited.add(pR * COLS + pC);
          pR = nr; pC = nc;
          moves++; movesEl.textContent = moves;
          if (moves === 1) startTimer();
          render();
          return;
        }
        if (atk.mechanic === 'adjacent') {
          attackEnemy(eR, eC, dr, dc);
          moves++; movesEl.textContent = moves;
          if (moves === 1) startTimer();
          render();
          return;
        }
        // contact: fall through — player walks onto former enemy cell below
        attackEnemy(eR, eC, dr, dc);
      }
    }

    visited.add(pR * COLS + pC);
    pR = nr; pC = nc;
    moves++; movesEl.textContent = moves;
    if (moves === 1) startTimer();
    render();
    if (pR === GOAL_R && pC === GOAL_C) celebrate();
  }

  // ── Timer ───────────────────────────────────────────────────
  function startTimer() {
    if (timerID) return;
    timerID = setInterval(function () { seconds++; timerEl.textContent = seconds + 's'; }, 1000);
  }

  // ── Win ─────────────────────────────────────────────────────
  function celebrate() {
    won = true; clearInterval(timerID);
    fMovesEl.textContent = moves; fTimeEl.textContent = seconds + 's';
    spawnParticles(); spawnWinRain();
    setTimeout(function () { winScreen.classList.add('open'); }, 600);
  }

  function spawnParticles() {
    var pool = ['❤️','💕','💖','💗','💝','💓','💞','✨','🌹'];
    for (var i = 0; i < 32; i++) {
      (function (delay) {
        setTimeout(function () {
          var el = document.createElement('div');
          el.className = 'cpart';
          el.textContent = pool[(Math.random() * pool.length) | 0];
          el.style.left = (Math.random() * window.innerWidth) + 'px';
          el.style.top  = (0.2 * window.innerHeight + Math.random() * 0.6 * window.innerHeight) + 'px';
          el.style.setProperty('--tx', ((Math.random() - 0.5) * 280) + 'px');
          el.style.setProperty('--ty', (-(Math.random() * 280 + 60)) + 'px');
          el.style.setProperty('--tr', ((Math.random() - 0.5) * 400) + 'deg');
          document.body.appendChild(el);
          setTimeout(function () { el.remove(); }, 1400);
        }, delay);
      }(i * 35));
    }
  }

  function spawnWinRain() {
    var pool = ['❤️','💕','💖','💗','💝'];
    for (var i = 0; i < 18; i++) {
      var el = document.createElement('div');
      el.className = 'win-rain';
      el.textContent = pool[i % pool.length];
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.fontSize = (1 + Math.random() * 1.2) + 'rem';
      var dur = 5 + Math.random() * 7;
      el.style.animationDuration = dur + 's';
      el.style.animationDelay = (Math.random() * -dur) + 's';
      winScreen.appendChild(el);
    }
  }

  // ── Input — keyboard ─────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); move(-1,  0); break;
      case 'ArrowDown':  e.preventDefault(); move( 1,  0); break;
      case 'ArrowLeft':  e.preventDefault(); move( 0, -1); break;
      case 'ArrowRight': e.preventDefault(); move( 0,  1); break;
    }
  });

  // ── Input — D-pad ────────────────────────────────────────────
  document.querySelectorAll('.dpad-btn[data-dir]').forEach(function (btn) {
    function go(e) {
      e.preventDefault();
      var d = btn.dataset.dir;
      if (d === 'up')    move(-1,  0);
      if (d === 'down')  move( 1,  0);
      if (d === 'left')  move( 0, -1);
      if (d === 'right') move( 0,  1);
    }
    btn.addEventListener('click',      go);
    btn.addEventListener('touchstart', go, { passive: false });
  });

  // ── Input — swipe on maze ────────────────────────────────────
  var swX, swY;
  mazeWrap.addEventListener('touchstart', function (e) {
    swX = e.touches[0].clientX; swY = e.touches[0].clientY;
  }, { passive: true });
  mazeWrap.addEventListener('touchend', function (e) {
    if (swX === undefined) return;
    var dx = e.changedTouches[0].clientX - swX;
    var dy = e.changedTouches[0].clientY - swY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { swX = undefined; return; }
    if (Math.abs(dx) > Math.abs(dy)) move(0, dx > 0 ? 1 : -1);
    else                              move(dy > 0 ? 1 : -1, 0);
    swX = undefined;
  }, { passive: true });

  // ── Seed controls ────────────────────────────────────────────
  function applySeed() { var v = parseInt(seedInput.value, 10); newGame(isNaN(v) ? currentSeed : v); }
  document.getElementById('btn-new-seed').addEventListener('click', function () { newGame(Math.floor(Math.random() * 99998) + 1); });
  document.getElementById('btn-apply-seed').addEventListener('click', applySeed);
  seedInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') applySeed(); });

  // ── Restart ──────────────────────────────────────────────────
  document.getElementById('btn-restart').addEventListener('click', function () {
    winScreen.querySelectorAll('.win-rain').forEach(function (el) { el.remove(); });
    winScreen.classList.remove('open');
    showCharScreen();
  });

  document.getElementById('btn-lose-restart').addEventListener('click', function () {
    loseScreen.classList.remove('open');
    showCharScreen();
  });

  // ── Boot ────────────────────────────────────────────────────
  showCharScreen();
}());
