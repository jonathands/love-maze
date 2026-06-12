// ══════════════════════════════════════════════════════════════
//  CONFIG — edit this object to customise the game and win screen
// ══════════════════════════════════════════════════════════════
var CONFIG = {
  seed:      null,
  gameName:  'O Labirinto de Joni',
  tagline:   'Encontre o tesouro escondidos...',
  title:     'Parabéns, vc achou meu tesouro!',
  message:   'Ter você do meu lado faz cada momento valer a pena, Te amo Li 💕 ',
  imageSrc:  'amore.jpg',
};

// ══════════════════════════════════════════════════════════════
//  ATTACKS — one entry per selectable character
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
    mechanic:  'adjacent',
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
    mechanic:  'ranged',
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
    mechanic:  'contact',
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

  // ── Maze generation (DFS + BFS for path-based enemy placement) ──
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

    // BFS to find shortest solution path
    var bfsQ    = [[START_R, START_C]];
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
    var path = [], step = [GOAL_R, GOAL_C];
    while (step) { path.unshift(step); step = bfsPrev[step[0] * 100 + step[1]]; }

    // Enemy 1: 20%–45% of path; Enemy 2: 55%–75%
    var lo1 = Math.max(1, Math.floor(path.length * 0.20));
    var hi1 = Math.min(path.length - 3, Math.floor(path.length * 0.45));
    var lo2 = Math.max(lo1 + 2, Math.floor(path.length * 0.55));
    var hi2 = Math.min(path.length - 2, Math.floor(path.length * 0.75));
    var p1  = path[lo1 + Math.floor(rng() * Math.max(1, hi1 - lo1 + 1))];
    var p2  = path[lo2 + Math.floor(rng() * Math.max(1, hi2 - lo2 + 1))];
    return { grid: grid, pos1: p1, pos2: p2 };
  }

  // ── State ───────────────────────────────────────────────────
  var MAZE = [];
  var currentSeed = (CONFIG.seed != null)
    ? CONFIG.seed
    : (Math.floor(Math.random() * 99998) + 1);
  var selectedChar = '⚔️';
  var difficulty   = 'normal';
  var pR, pC;
  // enemies: [{r, c, weak, label}]  — r=-1 means dead
  var enemies = [];
  var moves = 0, seconds = 0;
  var timerID = null, won = false;
  var visited = new Set();
  var lives = 3;
  var blocked = false;
  var shownQuaseLa = false;
  var firstGame = true;

  // ── DOM ─────────────────────────────────────────────────────
  var mazeEl        = document.getElementById('maze');
  var mazeWrap      = document.getElementById('maze-wrap');
  var movesEl       = document.getElementById('moves');
  var timerEl       = document.getElementById('timer');
  var heroDisplay   = document.getElementById('hero-display');
  var hintEl        = document.getElementById('hint-text');
  var winScreen     = document.getElementById('win-screen');
  var charScreen    = document.getElementById('char-screen');
  var lovePhoto     = document.getElementById('love-photo');
  var placeholder   = document.getElementById('photo-placeholder');
  var seedInput     = document.getElementById('seed-input');
  var charSeedInput = document.getElementById('char-seed-input');
  var livesEl       = document.getElementById('lives-display');
  var loseScreen    = document.getElementById('lose-screen');

  // ── Apply CONFIG to DOM ──────────────────────────────────────
  document.querySelector('.game-title').textContent = '⚔️ ' + CONFIG.gameName + ' ⚔️';
  document.querySelector('.game-sub').textContent   = CONFIG.tagline || '';
  document.title = CONFIG.gameName;
  document.getElementById('win-title').textContent  = CONFIG.title;
  document.getElementById('win-message').innerHTML  = CONFIG.message.replace(/\n/g, '<br>');
  if (CONFIG.imageSrc && CONFIG.imageSrc.trim() !== '') {
    lovePhoto.src = CONFIG.imageSrc;
    lovePhoto.style.display   = 'block';
    placeholder.style.display = 'none';
  } else {
    lovePhoto.style.display   = 'none';
    placeholder.style.display = 'flex';
  }

  // ── Touch detection ──────────────────────────────────────────
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch) {
    document.body.classList.add('is-touch');
    hintEl.textContent = 'Toque nas bordas da tela para mover';
  }

  // ── Character + difficulty select ────────────────────────────
  function showCharScreen() {
    charSeedInput.value = currentSeed;
    charScreen.classList.remove('fade-out');
    charScreen.classList.add('open');
    charScreen.querySelectorAll('.char-card').forEach(function (c) {
      c.classList.toggle('selected', c.dataset.emoji === selectedChar);
    });
    charScreen.querySelectorAll('.diff-btn').forEach(function (b) {
      b.classList.toggle('selected', b.dataset.diff === difficulty);
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

  charScreen.querySelectorAll('.diff-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      charScreen.querySelectorAll('.diff-btn').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      difficulty = btn.dataset.diff;
    });
  });

  document.getElementById('char-btn-new-seed').addEventListener('click', function () {
    charSeedInput.value = Math.floor(Math.random() * 99998) + 1;
  });

  // ── Enemy helpers ────────────────────────────────────────────
  function enemyAt(r, c) {
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].r === r && enemies[i].c === c) return i;
    }
    return -1;
  }

  function isEnemyTarget(pr, pc, er, ec) {
    var atk = ATTACKS[selectedChar] || ATTACKS['⚔️'];
    if (atk.mechanic === 'ranged') {
      if (pr === er && Math.abs(pc - ec) === 2 && MAZE[pr][(pc + ec) / 2] === 0) return true;
      if (pc === ec && Math.abs(pr - er) === 2 && MAZE[(pr + er) / 2][pc] === 0) return true;
    }
    return Math.abs(pr - er) + Math.abs(pc - ec) === 1;
  }

  // ── New game ─────────────────────────────────────────────────
  function newGame(seed) {
    seed = Math.max(1, Math.min(99999, seed | 0)) || 1;
    currentSeed = seed;
    seedInput.value = seed;
    removeAllFracoLabels();
    var result = generateMaze(seed);
    enemies = [{ r: result.pos1[0], c: result.pos1[1], weak: false, label: null }];
    if (difficulty === 'hard') {
      enemies.push({ r: result.pos2[0], c: result.pos2[1], weak: false, label: null });
    }
    heroDisplay.textContent = selectedChar;
    pR = START_R; pC = START_C;
    moves = 0; seconds = 0; won = false;
    lives = 3; blocked = false; shownQuaseLa = false;
    MAZE = result.grid;
    clearInterval(timerID); timerID = null;
    movesEl.textContent = '0'; timerEl.textContent = '0s';
    visited.clear();
    updateLives();
    winScreen.querySelectorAll('.win-rain').forEach(function (el) { el.remove(); });
    winScreen.classList.remove('open');
    loseScreen.classList.remove('open');
    buildGrid();
    if (isTouch && firstGame) {
      firstGame = false;
      var toast = document.getElementById('mobile-toast');
      toast.classList.add('show');
      setTimeout(function () {
        toast.classList.add('hide');
        setTimeout(function () { toast.classList.remove('show', 'hide'); }, 450);
      }, 3000);
    }
  }

  // ── Cell size ────────────────────────────────────────────────
  function computeCellPx() {
    var reserved = isTouch ? 130 : 340;
    var availH = window.innerHeight - reserved;
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

  // ── Proximity check (any living enemy in attack range) ───────
  function canAttackFrom(r, c) {
    var atk = ATTACKS[selectedChar] || ATTACKS['⚔️'];
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.r === -1) continue;
      if (isEnemyTarget(r, c, e.r, e.c)) return true;
    }
    return false;
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    var ready = canAttackFrom(pR, pC);
    var atk   = ATTACKS[selectedChar] || ATTACKS['⚔️'];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) continue;
        var el   = getCell(r, c);
        var eidx = enemyAt(r, c);
        if (r === pR && c === pC) {
          el.className  = 'cell path ' + (ready ? 'cell-player-ready' : 'cell-player');
          el.textContent = selectedChar;
        } else if (eidx !== -1) {
          var e   = enemies[eidx];
          var glow = ready && !e.weak && isEnemyTarget(pR, pC, e.r, e.c);
          var cls  = 'cell path cell-enemy' + (e.weak ? ' enemy-weak' : '') + (glow ? ' enemy-glow' : '');
          el.className = cls;
          if (glow) el.style.setProperty('--atk-color', atk.labelColor);
          else      el.style.removeProperty('--atk-color');
          el.textContent = '💀';
        } else if (r === GOAL_R && c === GOAL_C) {
          el.className  = 'cell path cell-treasure';
          el.textContent = '🎁';
        } else {
          el.className  = 'cell ' + (visited.has(r * COLS + c) ? 'visited' : 'path');
          el.textContent = '';
        }
      }
    }
    updateAllFracoLabels();
  }

  // ── Fraco floating labels ────────────────────────────────────
  function createFracoLabel(idx) {
    if (enemies[idx].label) return;
    var lbl = document.createElement('div');
    lbl.className   = 'enemy-fraco-label';
    lbl.textContent = 'FRACO';
    document.body.appendChild(lbl);
    enemies[idx].label = lbl;
  }

  function updateAllFracoLabels() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.label) continue;
      if (e.r === -1) { e.label.style.display = 'none'; continue; }
      var el = getCell(e.r, e.c);
      if (!el) continue;
      var rect = el.getBoundingClientRect();
      e.label.style.left    = (rect.left + rect.width / 2) + 'px';
      e.label.style.top     = (rect.bottom + 2) + 'px';
      e.label.style.display = 'block';
    }
  }

  function removeFracoLabel(idx) {
    if (enemies[idx] && enemies[idx].label) {
      enemies[idx].label.remove();
      enemies[idx].label = null;
    }
  }

  function removeAllFracoLabels() {
    for (var i = 0; i < enemies.length; i++) removeFracoLabel(i);
  }

  // ── Attack enemy (player wins) ───────────────────────────────
  function attackEnemy(idx, dr, dc) {
    var e   = enemies[idx];
    var r   = e.r, c = e.c;
    var atk = ATTACKS[selectedChar] || ATTACKS['⚔️'];
    var el  = getCell(r, c);
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width  / 2;
    var cy = rect.top  + rect.height / 2;

    el.textContent = atk.cellEmoji;
    el.className   = 'cell path cell-' + atk.cellAnim;
    setTimeout(function () { el.textContent = ''; el.className = 'cell path'; }, atk.duration + 60);

    var lbl = document.createElement('div');
    lbl.className   = 'attack-label';
    lbl.textContent = atk.label;
    lbl.style.color = atk.labelColor;
    lbl.style.left  = cx + 'px';
    lbl.style.top   = (cy - 10) + 'px';
    document.body.appendChild(lbl);
    setTimeout(function () { lbl.remove(); }, 1100);

    for (var i = 0; i < atk.count; i++) {
      (function (idx2) {
        var p    = atk.makeParticles(idx2, atk.count, cx, cy, dr, dc);
        var part = document.createElement('div');
        part.className   = 'expl-particle';
        part.textContent = atk.pool[idx2 % atk.pool.length];
        part.style.left  = p.x + 'px';
        part.style.top   = p.y + 'px';
        part.style.setProperty('--ex', p.ex + 'px');
        part.style.setProperty('--ey', p.ey + 'px');
        part.style.animationDuration = (atk.duration / 1000 + 0.1) + 's';
        part.style.animationDelay    = (Math.random() * 55) + 'ms';
        document.body.appendChild(part);
        setTimeout(function () { part.remove(); }, atk.duration + 200);
      }(i));
    }

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

    removeFracoLabel(idx);
    e.r = -1; e.c = -1;
  }

  // ── Lives display ────────────────────────────────────────────
  function updateLives() {
    livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
  }

  // ── Enemy counterattack — first encounter ────────────────────
  function enemyCounterattack(idx) {
    blocked = true;
    enemies[idx].weak = true;
    lives--;
    updateLives();

    var e       = enemies[idx];
    var enemyEl = getCell(e.r, e.c);
    enemyEl.classList.add('cell-enemy-strike');
    setTimeout(function () { enemyEl.classList.remove('cell-enemy-strike'); }, 500);

    var rect = enemyEl.getBoundingClientRect();
    var lbl  = document.createElement('div');
    lbl.className   = 'attack-label';
    lbl.textContent = '💀 Ataque Inimigo!';
    lbl.style.color = '#ff3300';
    lbl.style.left  = (rect.left + rect.width  / 2) + 'px';
    lbl.style.top   = (rect.top  + rect.height / 2 - 10) + 'px';
    document.body.appendChild(lbl);
    setTimeout(function () { lbl.remove(); }, 1100);

    document.body.classList.add('player-hit');
    setTimeout(function () { document.body.classList.remove('player-hit'); }, 450);

    var playerEl = getCell(pR, pC);
    playerEl.classList.add('cell-player-stunned');

    setTimeout(function () {
      pR = START_R; pC = START_C;
      render();
      createFracoLabel(idx);
      updateAllFracoLabels();

      var startEl = getCell(START_R, START_C);
      startEl.classList.add('cell-player-arrive');
      setTimeout(function () { startEl.classList.remove('cell-player-arrive'); }, 460);
      setTimeout(function () { blocked = false; }, 460);

      if (lives <= 0) {
        setTimeout(triggerGameOver, 600);
      } else {
        showRetryMessage();
      }
    }, 520);
  }

  // ── "TENTE DE NOVO!" message ──────────────────────────────────
  function showRetryMessage() {
    var msg = document.createElement('div');
    msg.className   = 'retry-message';
    msg.textContent = 'TENTE DE NOVO!';
    document.body.appendChild(msg);
    setTimeout(function () { msg.remove(); }, 1800);
  }

  // ── "Quase lá!" proximity message ────────────────────────────
  function showQuaseLa() {
    var msg = document.createElement('div');
    msg.className   = 'quase-la-msg';
    msg.textContent = 'Quase lá! 🎁';
    document.body.appendChild(msg);
    setTimeout(function () { msg.remove(); }, 2500);
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

    // ── Ranged attack check (2 tiles ahead) ───────────────────
    if (atk.mechanic === 'ranged') {
      var ar = pR + dr * 2, ac = pC + dc * 2;
      var ridx = enemyAt(ar, ac);
      if (ridx !== -1 && MAZE[pR + dr][pC + dc] === 0) {
        if (!enemies[ridx].weak) { enemyCounterattack(ridx); return; }
        attackEnemy(ridx, dr, dc);
        visited.add(pR * COLS + pC);
        pR = nr; pC = nc;
        moves++; movesEl.textContent = moves;
        if (moves === 1) startTimer();
        checkQuaseLa();
        render();
        return;
      }
    }

    // ── Adjacent / contact check (1 tile ahead) ───────────────
    var cidx = enemyAt(nr, nc);
    if (cidx !== -1) {
      if (atk.mechanic === 'adjacent') {
        if (!enemies[cidx].weak) { enemyCounterattack(cidx); return; }
        attackEnemy(cidx, dr, dc);
        moves++; movesEl.textContent = moves;
        if (moves === 1) startTimer();
        render();
        return;
      }
      // contact mechanic
      if (!enemies[cidx].weak) { enemyCounterattack(cidx); return; }
      attackEnemy(cidx, dr, dc);
      // fall through — player steps onto former enemy cell
    }

    visited.add(pR * COLS + pC);
    pR = nr; pC = nc;
    moves++; movesEl.textContent = moves;
    if (moves === 1) startTimer();
    checkQuaseLa();
    render();
    if (pR === GOAL_R && pC === GOAL_C) celebrate();
  }

  function checkQuaseLa() {
    if (!shownQuaseLa && !won && Math.abs(pR - GOAL_R) + Math.abs(pC - GOAL_C) <= 3) {
      shownQuaseLa = true;
      showQuaseLa();
    }
  }

  // ── Timer ───────────────────────────────────────────────────
  function startTimer() {
    if (timerID) return;
    timerID = setInterval(function () { seconds++; timerEl.textContent = seconds + 's'; }, 1000);
  }

  // ── Win ─────────────────────────────────────────────────────
  function celebrate() {
    won = true; clearInterval(timerID);
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

  // ── Input — D-pad (desktop fallback) ─────────────────────────
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

  // ── Input — edge controls (touch) ────────────────────────────
  document.querySelectorAll('.edge-ctrl[data-dir]').forEach(function (zone) {
    zone.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var d = zone.dataset.dir;
      if (d === 'up')    move(-1,  0);
      if (d === 'down')  move( 1,  0);
      if (d === 'left')  move( 0, -1);
      if (d === 'right') move( 0,  1);
    }, { passive: false });
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
