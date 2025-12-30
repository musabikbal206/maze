// PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(()=>{});
    });
}

const CONST = {
    WALL: 1, PATH: 0, START: 2, END: 3,
    CELL_SIZE: 4, 
    SPEED_3D: 3.5, 
    SPEED_2D: 10.0,
    ROT_SPEED: 2.5, 
    COLLISION_RADIUS: 0.2,
    GHOST_SPEED: 1.8,
    GHOST_SPEED_2D: 5.5, // Faster speed for 2D mode
    TIME_PENALTY_2D: 3.0 // Time passes 3x faster in 2D
};

const Theme = {
    current: 'night',
    data: {
        night: { bg: 0x020617, fog: 0x020617, ambient: 0.4, cssBg: '#020617' },
        day: { bg: 0x87CEEB, fog: 0x87CEEB, ambient: 0.8, cssBg: '#f0f9ff' }
    },
    toggle() {
        this.current = this.current === 'night' ? 'day' : 'night';
        return this.current;
    },
    get() { return this.data[this.current]; }
};

// --- LANGUAGE SYSTEM (EN/TR) ---
const Lang = {
    current: 'en',
    data: {
        en: {
            title: "MAZEMAZING", subtitle: "3D / 2D Engine • Pro",
            easy: "Easy (10x10)", medium: "Medium (25x25)", hard: "Hard (50x50)", extreme: "Extreme (100x100)",
            code_label: "OR USE A CODE", load_map: "LOAD MAP", map_editor: "Map Editor",
            sound_on: "Sound On", sound_off: "Sound Off",
            exit: "Exit", view_3d: "3D View", view_2d: "2D Map", view_3rd: "3rd Person",
            back: "Back", play: "Play", draw: "DRAW", pan: "PAN",
            wall: "Wall", path: "Path", start: "Start", end: "End",
            prop_grid: "Grid Size", prop_zoom: "Zoom Level", gen_title: "Generator", gen: "GEN", clear: "CLEAR MAP",
            complete: "COMPLETE!", main_menu: "Main Menu", hint_move: "Move", hint_map: "Map", hint_view: "View"
        },
        tr: {
            title: "MAZEMAZING", subtitle: "3D / 2D Motoru • Pro",
            easy: "Kolay (10x10)", medium: "Orta (25x25)", hard: "Zor (50x50)", extreme: "Ekstrem (100x100)",
            code_label: "VEYA KOD KULLAN", load_map: "HARİTA YÜKLE", map_editor: "Harita Editörü",
            sound_on: "Ses Açık", sound_off: "Ses Kapalı",
            exit: "Çıkış", view_3d: "3D Görünüm", view_2d: "2D Harita", view_3rd: "3. Şahıs",
            back: "Geri", play: "Oyna", draw: "ÇİZ", pan: "KAYDIR",
            wall: "Duvar", path: "Yol", start: "Başla", end: "Bitiş",
            prop_grid: "Izgara Boyutu", prop_zoom: "Yakınlaştırma", gen_title: "Oluşturucu", gen: "ÜRET", clear: "TEMİZLE",
            complete: "TAMAMLANDI!", main_menu: "Ana Menü", hint_move: "Hareket", hint_map: "Harita", hint_view: "Görünüm"
        }
    },
    toggle() {
        this.current = this.current === 'en' ? 'tr' : 'en';
        this.apply();
    },
    apply() {
        const dict = this.data[this.current];
        document.getElementById('lbl-lang').innerText = this.current.toUpperCase();
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if(dict[key]) el.innerText = dict[key];
        });
        const sfxText = Sfx.enabled ? dict.sound_on : dict.sound_off;
        document.getElementById('txt-sound').innerText = sfxText;
    },
    get(key) { return this.data[this.current][key] || key; }
};

const Utils = {
    randomCode(inputId) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
        let result = "";
        for(let i=0; i<5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        document.getElementById(inputId).value = result;
    }
};

const MenuNav = {
    index: -1,
    buttons: [],
    init() {
        this.buttons = Array.from(document.querySelectorAll('#menu-list button[data-nav="true"]'));
        this.index = -1;
        this.updateFocus();
    },
    move(dir) {
        if(this.buttons.length === 0) this.init();
        this.index += dir;
        if(this.index < 0) this.index = this.buttons.length - 1;
        if(this.index >= this.buttons.length) this.index = 0;
        this.updateFocus();
    },
    updateFocus() {
        this.buttons.forEach((b, i) => {
            if(i === this.index) b.classList.add('menu-focus');
            else b.classList.remove('menu-focus');
        });
    },
    select() {
        if(this.index > -1 && this.buttons[this.index]) {
            this.buttons[this.index].click();
        }
    }
};

const Sfx = {
    ctx: null, enabled: true,
    init() {
        if(!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if(AudioContext) this.ctx = new AudioContext();
        }
        if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    toggle() {
        this.enabled = !this.enabled;
        const i = document.getElementById('icon-sound');
        const t = document.getElementById('txt-sound');
        const dict = Lang.data[Lang.current];
        if(this.enabled) { 
            i.className="ph ph-speaker-high"; 
            t.innerText=dict.sound_on; 
        } else { 
            i.className="ph ph-speaker-slash"; 
            t.innerText=dict.sound_off; 
        }
        this.click();
    },
    playTone(freq, type, dur, vol=0.1, slide=0) {
        if(!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if(slide !== 0) osc.frequency.linearRampToValueAtTime(freq + slide, this.ctx.currentTime + dur);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },
    playNoise(dur, vol=0.1) {
        if(!this.enabled || !this.ctx) return;
        const bufSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    },
    click() { this.playTone(800, 'triangle', 0.05, 0.05); },
    step() { this.playNoise(0.05, 0.03); },
    win() {
        if(!this.enabled) return;
        [0, 150, 300, 450].forEach((d, i) => {
            setTimeout(() => this.playTone(440 + (i*110), 'triangle', 0.3, 0.1), d);
        });
    },
    loss() {
        if(!this.enabled) return;
        [0, 200, 400].forEach((d, i) => {
            setTimeout(() => this.playTone(150 - (i*30), 'sawtooth', 0.4, 0.2), d);
        });
    }
};

const TexGen = {
    createTechWall() {
        const s = 512;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1e293b'; ctx.fillRect(0,0,s,s);
        for(let i=0; i<4000; i++) {
            ctx.fillStyle = Math.random()>0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)';
            ctx.fillRect(Math.random()*s, Math.random()*s, 2, 2);
        }
        ctx.fillStyle = '#334155'; const padding = 20; ctx.fillRect(padding, padding, s-padding*2, s-padding*2);
        ctx.fillStyle = '#475569'; 
        const r = 5; const locs = [40, s-40];
        locs.forEach(x => locs.forEach(y => { 
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); 
            ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x+2,y+2,r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#475569';
        }));
        ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(40, s/2); ctx.lineTo(s-40, s/2); ctx.stroke();
        ctx.shadowBlur=10; ctx.shadowColor='#0ea5e9'; ctx.stroke(); ctx.shadowBlur=0;
        return new THREE.CanvasTexture(c);
    },
    createTechFloor() {
        const s = 512;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,s,s);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(s,0); ctx.lineTo(s,s); ctx.stroke();
        for(let i=0; i<2000; i++) {
                ctx.fillStyle = 'rgba(255,255,255,0.02)';
                ctx.fillRect(Math.random()*s, Math.random()*s, 2, 2);
        }
        const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
    },
    createHedgeWall() {
        const s = 512;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#064e3b'; // Base dark green
        ctx.fillRect(0,0,s,s);
        // Leaves
        for(let i=0; i<15000; i++) {
            const val = Math.floor(Math.random() * 80);
            ctx.fillStyle = `rgb(${20+val}, ${80+val}, ${20+val})`; 
            const lx = Math.random() * s;
            const ly = Math.random() * s;
            const ls = Math.random() * 10 + 4;
            ctx.beginPath(); ctx.arc(lx, ly, ls, 0, Math.PI*2); ctx.fill();
        }
        // Shadow Vignette
        const grad = ctx.createRadialGradient(s/2, s/2, s/3, s/2, s/2, s/1.5);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,s,s);
        return new THREE.CanvasTexture(c);
    },
    createGrassFloor() {
        const s = 512;
        const c = document.createElement('canvas'); c.width=s; c.height=s;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#14532d'; // Dirtier green
        ctx.fillRect(0,0,s,s);
        // Grass blades
        for(let i=0; i<10000; i++) {
                ctx.fillStyle = Math.random()>0.5 ? '#166534' : '#15803d';
                ctx.fillRect(Math.random()*s, Math.random()*s, 3, 3);
        }
        // Dirt patches
        for(let i=0; i<50; i++) {
            ctx.fillStyle = 'rgba(60, 40, 10, 0.2)';
            const lx = Math.random() * s;
            const ly = Math.random() * s;
            const r = Math.random() * 50;
            ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI*2); ctx.fill();
        }
        const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; return tex;
    }
};

const Timer = {
    el: null, elapsed: 0, timeLeft: 0, lastTick: 0, interval: null, running: false, mode: 'normal',
    init() { this.el = document.getElementById('game-timer'); },
    start(mode, limitSeconds) {
        this.running = true; this.mode = mode;
        this.lastTick = Date.now();
        this.el.style.display = 'block';
        this.el.classList.remove('danger', 'turbo');
        
        if (mode === 'time') {
            this.timeLeft = limitSeconds * 1000;
            this.elapsed = 0;
            this.el.innerText = this.format(this.timeLeft);
        } else {
            this.elapsed = 0;
            this.el.innerText = '00:00';
        }
        this.update();
        this.interval = setInterval(() => this.update(), 100);
    },
    stop() { this.running = false; clearInterval(this.interval); return this.format(this.elapsed); },
    reset() { this.running = false; clearInterval(this.interval); this.elapsed = 0; this.el.style.display = 'none'; },
    update() {
        if(!this.running) return;
        const now = Date.now(); 
        let delta = now - this.lastTick; 
        this.lastTick = now;
        
        if (this.mode === 'time') {
            // --- TIME SPEED MULTIPLIER FOR 2D ---
            if (Game.is2D) {
                delta *= CONST.TIME_PENALTY_2D;
                this.el.classList.add('turbo');
            } else {
                this.el.classList.remove('turbo');
            }
            // ------------------------------------

            this.timeLeft -= delta;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                Game.gameOver("Time's Up!");
                return;
            }
            if (this.timeLeft < 10000) this.el.classList.add('danger');
            this.el.innerText = this.format(this.timeLeft);
        } else {
            const multiplier = (!Game.is2D) ? 1 : (CONST.SPEED_2D / CONST.SPEED_3D);
            this.elapsed += delta * multiplier;
            this.el.innerText = this.format(this.elapsed);
        }
    },
    format(ms) {
        const totalSecs = Math.ceil(ms / 1000);
        const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
        const s = (totalSecs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
};

const Seed = {
    rng: Math.random, current: null,
    hash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; },
    mulberry32(a) { return function() { var t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; } },
    set(code) { if(!code) { this.reset(); return; } const seedInt = this.hash(code); this.rng = this.mulberry32(seedInt); this.current = code; },
    reset() { this.rng = Math.random; this.current = null; }
};

class Joystick {
    constructor(zoneId, thumbId, maxDist = 40) {
        this.zone = document.getElementById(zoneId); this.thumb = document.getElementById(thumbId);
        this.maxDist = maxDist; this.active = false; this.data = { x: 0, y: 0 }; this.origin = { x: 0, y: 0 };
        this.bindEvents();
    }
    bindEvents() {
        const handleStart = (e) => {
            e.preventDefault(); this.active = true;
            const rect = this.zone.getBoundingClientRect();
            this.origin = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
            this.update(e); this.zone.querySelector('.stick-base').style.borderColor = "rgba(34, 211, 238, 0.5)";
        };
        const handleMove = (e) => { if(!this.active) return; e.preventDefault(); this.update(e); };
        const handleEnd = (e) => {
            e.preventDefault(); this.active = false; this.data = {x:0, y:0};
            this.thumb.style.transform = `translate(-50%, -50%)`;
            this.zone.querySelector('.stick-base').style.borderColor = "";
        };
        this.zone.addEventListener('touchstart', handleStart, {passive: false});
        this.zone.addEventListener('touchmove', handleMove, {passive: false});
        this.zone.addEventListener('touchend', handleEnd); this.zone.addEventListener('touchcancel', handleEnd);
    }
    update(e) {
        const touch = e.targetTouches ? e.targetTouches[0] : e;
        const dx = touch.clientX - this.origin.x; const dy = touch.clientY - this.origin.y;
        const dist = Math.sqrt(dx*dx + dy*dy); const angle = Math.atan2(dy, dx);
        const clamped = Math.min(dist, this.maxDist);
        const tx = Math.cos(angle) * clamped; const ty = Math.sin(angle) * clamped;
        this.thumb.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
        this.data.x = tx / this.maxDist; this.data.y = ty / this.maxDist;
    }
}

const Input = {
    keys: { w:false, s:false, l:false, r:false }, stick: null, initialized: false,
    init() {
        if(this.initialized) return; this.initialized = true;
        const k = (e,v) => {
            const key = e.key.toLowerCase();
            if(key==='w'||key==='arrowup') this.keys.w=v; if(key==='s'||key==='arrowdown') this.keys.s=v;
            if(key==='a'||key==='arrowleft') this.keys.l=v; if(key==='d'||key==='arrowright') this.keys.r=v;
            
            if (v) {
                if(key === 'escape') {
                    if(Game.running) Game.quit();
                    if(!document.getElementById('screen-editor').classList.contains('hidden')) Editor.close();
                }
                if (Game.running) {
                    if (key === 'm') Game.toggleDimension();
                    if (key === 'v') Game.toggleCamera();
                }
                const menu = document.getElementById('screen-menu');
                if (!menu.classList.contains('hidden')) {
                    if(key === 'arrowup') { MenuNav.move(-1); Sfx.click(); }
                    if(key === 'arrowdown') { MenuNav.move(1); Sfx.click(); }
                    if(key === 'enter') { MenuNav.select(); Sfx.click(); }
                }
            }
        };
        window.addEventListener('keydown', e=>k(e,true)); window.addEventListener('keyup', e=>k(e,false));
        if('ontouchstart' in window || navigator.maxTouchPoints > 0) { this.stick = new Joystick('stick-zone', 'stick-thumb'); } 
        else { document.getElementById('controls-hint').classList.remove('hidden'); }
    },
    get(is3D) {
        let dx = 0, dz = 0, rot = 0;
        if (is3D) {
            if(this.keys.w) dz = 1; if(this.keys.s) dz = -1;
            if(this.keys.l) rot = 1; if(this.keys.r) rot = -1;
        } else {
            if(this.keys.w) dz = -1; if(this.keys.s) dz = 1;
            if(this.keys.l) dx = -1; if(this.keys.r) dx = 1;
        }
        if(this.stick && this.stick.active) {
            const sx = this.stick.data.x; const sy = this.stick.data.y;
            if(is3D) { dz = -sy; rot = -sx; } else { dx = sx; dz = sy; }
        }
        return { dx, dz, rot };
    }
};

const MazeGen = {
    generate(w, h, rng = Math.random) {
        let map = Array(h).fill().map(() => Array(w).fill(CONST.WALL));
        const stack = [];
        const randOdd = (limit) => Math.floor(rng() * Math.floor((limit - 1) / 2)) * 2 + 1;
        let genX = randOdd(w); let genY = randOdd(h);
        map[genY][genX] = CONST.PATH; stack.push({x: genX, y: genY});
        const dirs = [{x:0, y:-2}, {x:0, y:2}, {x:-2, y:0}, {x:2, y:0}];
        while(stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];
            for(let d of dirs) {
                const nx = current.x + d.x; const ny = current.y + d.y;
                if(nx > 0 && nx < w-1 && ny > 0 && ny < h-1 && map[ny][nx] === CONST.WALL) {
                    neighbors.push({x: nx, y: ny, dx: d.x/2, dy: d.y/2});
                }
            }
            if(neighbors.length > 0) {
                const next = neighbors[Math.floor(rng() * neighbors.length)];
                map[next.y][next.x] = CONST.PATH; map[current.y + next.dy][current.x + next.dx] = CONST.PATH;
                stack.push({x: next.x, y: next.y});
            } else { stack.pop(); }
        }
        
        // Add Escaping Routes (Braid the maze) for Ghost Mode
        if (Game.mode === 'ghost') {
            for(let y = 1; y < h-1; y++) {
                for(let x = 1; x < w-1; x++) {
                    if(map[y][x] === CONST.PATH) {
                        let walls = 0;
                        if(map[y-1][x] === CONST.WALL) walls++;
                        if(map[y+1][x] === CONST.WALL) walls++;
                        if(map[y][x-1] === CONST.WALL) walls++;
                        if(map[y][x+1] === CONST.WALL) walls++;
                        if(walls === 3 && rng() < 0.2) {
                            const neighbors = [];
                            if(y>1 && map[y-2][x]===CONST.PATH) neighbors.push({x:x, y:y-1});
                            if(y<h-2 && map[y+2][x]===CONST.PATH) neighbors.push({x:x, y:y+1});
                            if(x>1 && map[y][x-2]===CONST.PATH) neighbors.push({x:x-1, y:y});
                            if(x<w-2 && map[y][x+2]===CONST.PATH) neighbors.push({x:x+1, y:y});
                            if(neighbors.length > 0) {
                                const n = neighbors[Math.floor(rng()*neighbors.length)];
                                map[n.y][n.x] = CONST.PATH;
                            }
                        }
                    }
                }
            }
        }

        const deadEnds = [];
        for(let y = 1; y < h - 1; y++) {
            for(let x = 1; x < w - 1; x++) {
                if(map[y][x] === CONST.PATH) {
                    let neighbors = 0;
                    if(map[y-1][x] !== CONST.WALL) neighbors++; if(map[y+1][x] !== CONST.WALL) neighbors++;
                    if(map[y][x-1] !== CONST.WALL) neighbors++; if(map[y][x+1] !== CONST.WALL) neighbors++;
                    if(neighbors === 1) deadEnds.push({x, y});
                }
            }
        }
        if(deadEnds.length < 2) deadEnds.push({x: genX, y: genY});
        const startIndex = Math.floor(rng() * deadEnds.length);
        const startNode = deadEnds[startIndex];
        map[startNode.y][startNode.x] = CONST.START;
        const candidates = deadEnds.filter((_, i) => i !== startIndex).map(d => {
            return { node: d, dist: Math.abs(d.x - startNode.x) + Math.abs(d.y - startNode.y) };
        });
        candidates.sort((a, b) => b.dist - a.dist);
        const topCount = Math.max(1, Math.min(5, Math.floor(candidates.length * 0.2)));
        const chosenCandidate = candidates[Math.floor(rng() * topCount)] || candidates[0];
        const bestEnd = chosenCandidate ? chosenCandidate.node : deadEnds[(startIndex + 1) % deadEnds.length];
        map[bestEnd.y][bestEnd.x] = CONST.END;
        return map;
    }
};

const Pathfinding = {
    findPath(map, start, end, w, h) {
        const openSet = [{x: start.x, y: start.y, f: 0, g: 0, p: null}];
        const closedSet = new Set();
        while (openSet.length > 0) {
            let lowestIndex = 0;
            for(let i=1; i<openSet.length; i++) if(openSet[i].f < openSet[lowestIndex].f) lowestIndex = i;
            const current = openSet[lowestIndex];
            if (Math.abs(current.x - end.x) < 0.5 && Math.abs(current.y - end.y) < 0.5) {
                const path = [];
                let temp = current;
                while(temp.p) { path.push({x:temp.x, y:temp.y}); temp = temp.p; }
                return path.reverse();
            }
            openSet.splice(lowestIndex, 1);
            closedSet.add(`${current.x},${current.y}`);
            const neighbors = [
                {x: current.x+1, y: current.y}, {x: current.x-1, y: current.y},
                {x: current.x, y: current.y+1}, {x: current.x, y: current.y-1}
            ];
            for(let n of neighbors) {
                if(n.x<0||n.x>=w||n.y<0||n.y>=h||map[n.y][n.x]===CONST.WALL) continue;
                if(closedSet.has(`${n.x},${n.y}`)) continue;
                const gScore = current.g + 1;
                let neighborNode = openSet.find(node => node.x === n.x && node.y === n.y);
                if(!neighborNode) {
                    neighborNode = {
                        x: n.x, y: n.y, g: gScore, 
                        h: Math.abs(n.x - end.x) + Math.abs(n.y - end.y),
                        p: current
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openSet.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.p = current;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                }
            }
        }
        return []; 
    }
};

const GFX = {
    scene: null, camera: null, renderer: null, wallsMesh: null,
    wallTex: null, floorTex: null, playerMesh: null, ghostMesh: null,
    ambientLight: null,
    init() {
        if(this.renderer) return;
        const cvs = document.getElementById('c3d');
        this.renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.scene = new THREE.Scene();
        
        // Initialize lights
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.ambientLight.userData.keep = true;
        this.scene.add(this.ambientLight);

        this.pl = new THREE.PointLight(0xffffff, 1.0, 15);
        this.pl.userData.keep = true;
        this.scene.add(this.pl);
        
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
        this.camera.userData.keep = true;

        // Load initial theme settings
        this.applyTheme();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    },
    applyTheme() {
        const t = Theme.get();
        if(!this.scene) return;
        
        this.scene.background = new THREE.Color(t.bg);
        this.scene.fog = new THREE.Fog(t.fog, 2, 20);
        if(this.ambientLight) this.ambientLight.intensity = t.ambient;
        document.body.style.backgroundColor = t.cssBg;

        // Generate new textures
        if(Theme.current === 'night') {
            this.wallTex = TexGen.createTechWall();
            this.floorTex = TexGen.createTechFloor();
        } else {
            this.wallTex = TexGen.createHedgeWall();
            this.floorTex = TexGen.createGrassFloor();
        }

        // If meshes exist, update their materials
        if(this.wallsMesh) this.wallsMesh.material.map = this.wallTex;
        // Floor is a separate mesh usually
        const floorObj = this.scene.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
        if(floorObj) floorObj.material.map = this.floorTex;
    },
    createPlayer() {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(1, 1.8, 1);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x22d3ee });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        group.add(body);
        const visorGeo = new THREE.BoxGeometry(0.8, 0.4, 0.2);
        const visorMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.4, -0.5); 
        group.add(visor);
        return group;
    },
    createGhost() {
        const group = new THREE.Group();
        const bodyGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.2;
        group.add(body);
        
        const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.25, 1.3, -0.6);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.25, 1.3, -0.6);
        group.add(leftEye); group.add(rightEye);
        
        const light = new THREE.PointLight(0xff0000, 1, 6);
        light.position.y = 1.2;
        group.add(light);
        
        return group;
    },
    build(map, w, h) {
        if (!this.scene) this.init();
        
        // Ensure theme is applied to new textures
        this.applyTheme();

        for(let i = this.scene.children.length - 1; i >= 0; i--) {
                const c = this.scene.children[i];
                if(!c.userData.keep) { 
                    this.scene.remove(c); 
                    if(c.geometry) c.geometry.dispose(); 
                    if(c.material) c.material.dispose();
                }
        }
        
        this.playerMesh = this.createPlayer();
        this.scene.add(this.playerMesh);

        if (Game.mode === 'ghost') {
            this.ghostMesh = this.createGhost();
            this.scene.add(this.ghostMesh);
        } else {
            this.ghostMesh = null;
        }

        const floorGeo = new THREE.PlaneGeometry(w*4, h*4);
        this.floorTex.repeat.set(w/2, h/2);
        const floorMat = new THREE.MeshLambertMaterial({ map: this.floorTex });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI/2;
        floor.position.set(w*2, 0, h*2); 
        this.scene.add(floor);

        const wallCount = map.flat().filter(c => c === CONST.WALL).length;
        const geo = new THREE.BoxGeometry(4, 4, 4);
        const mat = new THREE.MeshLambertMaterial({ map: this.wallTex });
        this.wallsMesh = new THREE.InstancedMesh(geo, mat, wallCount);
        
        const dummy = new THREE.Object3D();
        let idx = 0;
        for(let z=0; z<h; z++) {
            for(let x=0; x<w; x++) {
                const t = map[z][x];
                const worldX = x * 4 + 2; const worldZ = z * 4 + 2;
                if(t === CONST.WALL) {
                    dummy.position.set(worldX, 2, worldZ);
                    dummy.updateMatrix();
                    this.wallsMesh.setMatrixAt(idx++, dummy.matrix);
                } else if(t === CONST.END) {
                    const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
                    orb.position.set(worldX, 2, worldZ);
                    this.scene.add(orb);
                    const pl = new THREE.PointLight(0xff0000, 2, 8);
                    pl.position.set(worldX, 2, worldZ); 
                    this.scene.add(pl);
                }
            }
        }
        this.scene.add(this.wallsMesh);
    },
    
    getSafeCameraPos(px, pz, tx, tz, map, w, h) {
        const dx = tx - px;
        const dz = tz - pz;
        const dist = Math.sqrt(dx*dx + dz*dz);
        const steps = Math.ceil(dist * 2); 
        for(let i = 1; i <= steps; i++) {
            const t = i / steps;
            const cx = px + dx * t;
            const cz = pz + dz * t;
            const gx = Math.floor(cx / 4);
            const gz = Math.floor(cz / 4);
            if (gx >= 0 && gx < w && gz >= 0 && gz < h) {
                if (map[gz][gx] === CONST.WALL) {
                    const safeT = Math.max(0, (i - 1.5) / steps);
                    return { x: px + dx * safeT, z: pz + dz * safeT };
                }
            }
        }
        return { x: tx, z: tz };
    },

    snapCamera: true,
    render(player, is2D, isThirdPerson, ghost) {
        const px = player.x * 4;
        const pz = player.z * 4;
        
        if (this.playerMesh) {
            this.playerMesh.position.set(px, 0, pz);
            this.playerMesh.rotation.y = player.dir + Math.PI; 
            this.playerMesh.visible = isThirdPerson;
        }

        if (this.ghostMesh && ghost) {
            const gx = ghost.x * 4;
            const gz = ghost.z * 4;
            this.ghostMesh.position.set(gx, 0, gz);
            this.ghostMesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.3;
            this.ghostMesh.lookAt(px, 1.2, pz);
        }

        if (!is2D) {
            if (isThirdPerson) {
                const dist = 10;
                const height = 10;
                let targetX = px + Math.sin(player.dir) * dist;
                let targetZ = pz + Math.cos(player.dir) * dist;
                const safePos = this.getSafeCameraPos(px, pz, targetX, targetZ, Game.map, Game.w, Game.h);
                targetX = safePos.x; targetZ = safePos.z;
                if (this.snapCamera) {
                    this.camera.position.set(targetX, height, targetZ);
                    this.snapCamera = false;
                } else {
                    const idealPos = new THREE.Vector3(targetX, height, targetZ);
                    this.camera.position.lerp(idealPos, 0.1);
                }
                this.camera.lookAt(px, 1, pz); 
            } else {
                this.camera.position.set(px, 1.6, pz);
                const tx = px - Math.sin(player.dir);
                const tz = pz - Math.cos(player.dir);
                this.camera.lookAt(tx, 1.6, tz);
                this.snapCamera = true; 
            }
            this.pl.position.set(px, 5, pz);
            this.renderer.render(this.scene, this.camera);
        }
    },
    render2D(map, w, h, p, ghost, cvsId) {
        const cvs = document.getElementById(cvsId);
        const ctx = cvs.getContext('2d');
        const isMini = cvsId === 'minimap';
        
        // Use theme colors for 2D map
        const t = Theme.get();
        const bg = Theme.current === 'day' ? '#e0f2fe' : '#020617'; // Light Blue vs Dark
        const wallColor = Theme.current === 'day' ? '#15803d' : '#475569'; // Green vs Slate
        const floorColor = Theme.current === 'day' ? '#86efac' : '#0f172a'; // Light Green vs Dark Slate

        if(!isMini) {
            if(cvs.width !== window.innerWidth) { cvs.width=window.innerWidth; cvs.height=window.innerHeight; }
            ctx.fillStyle = bg; ctx.fillRect(0,0,cvs.width,cvs.height);
        } else {
            const wrapper = document.getElementById('minimap-wrapper');
            if(cvs.width !== wrapper.clientWidth || cvs.height !== wrapper.clientHeight) {
                cvs.width = wrapper.clientWidth;
                cvs.height = wrapper.clientHeight;
            }
            ctx.fillStyle = "rgba(15, 23, 42, 0.95)"; ctx.fillRect(0,0,cvs.width,cvs.height);
        }
        const pad = isMini ? 0 : 40;
        const sw = cvs.width-pad; const sh = cvs.height-pad;
        const scale = Math.min(sw/w, sh/h);
        const ox = (cvs.width - w*scale)/2;
        const oy = (cvs.height - h*scale)/2;
        
        for(let z=0; z<h; z++) for(let x=0; x<w; x++) {
            const type = map[z][x];
            if(isMini && type!==CONST.WALL && type!==CONST.END && type!==CONST.START) continue;
            
            if(type===CONST.WALL) ctx.fillStyle = wallColor;
            else if(type===CONST.END) ctx.fillStyle = '#ef4444';
            else if(type===CONST.START) ctx.fillStyle = '#10b981';
            else if(type===CONST.PATH && !isMini) ctx.fillStyle = floorColor;
            else continue;
            
            ctx.fillRect(ox+x*scale, oy+z*scale, scale+0.5, scale+0.5);
        }
        
        // --- GHOST FIX: Remove scale/2 offset ---
        if (Game.mode === 'ghost' && ghost) {
            const gx = ox + ghost.x*scale;
            const gy = oy + ghost.z*scale;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath(); 
            // gx/gy are already centered coordinates because ghost.x/z are fractional (e.g. 1.5)
            // and ox starts at index 0. So ox + 1.5*scale puts us exactly in the middle of cell 1.
            ctx.arc(gx, gy, scale/3, 0, Math.PI*2); 
            ctx.fill();
        }
        // ----------------------------------------

        const px = ox + p.x*scale; const py = oy + p.z*scale;
        ctx.save();
        ctx.translate(px, py);
        if(isMini) ctx.rotate(-p.dir); else ctx.rotate(p.dir); 
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.moveTo(0, -scale*0.7); ctx.lineTo(scale*0.4, scale*0.5); ctx.lineTo(0, scale*0.3); ctx.lineTo(-scale*0.4, scale*0.5); ctx.fill();
        ctx.restore();
    }
};

const UI = {
    applyTheme() {
        const mode = Theme.current;
        const isDay = mode === 'day';
        
        // Toggle Body Class
        document.body.classList.toggle('theme-day', isDay);

        // Main Menu
        const menu = document.getElementById('screen-menu');
        if (isDay) {
            menu.classList.remove('bg-slate-950/95');
            menu.classList.add('bg-slate-100/85'); // More transparent background for light mode
        } else {
            menu.classList.remove('bg-slate-100/85');
            menu.classList.add('bg-slate-950/95');
        }

        // Editor BG
        const editor = document.getElementById('screen-editor');
        if (isDay) {
            editor.classList.remove('bg-slate-950');
            editor.classList.add('bg-sky-50');
        } else {
            editor.classList.remove('bg-sky-50');
            editor.classList.add('bg-slate-950');
        }

        // Editor Sidebar
        const sidebar = document.getElementById('editor-sidebar');
        const header = document.getElementById('editor-header');
        if (isDay) {
            sidebar.classList.remove('bg-slate-900', 'border-slate-800');
            sidebar.classList.add('bg-white', 'border-slate-200');
            header.classList.remove('bg-slate-900', 'border-slate-800');
            header.classList.add('bg-white', 'border-slate-200');
            
            // Update header text color
            header.querySelector('h2').classList.remove('text-slate-100');
            header.querySelector('h2').classList.add('text-slate-800');
            
            // Update Back button styling for day
            const backBtn = document.getElementById('btn-editor-back');
            backBtn.classList.remove('bg-slate-800', 'text-slate-300', 'hover:text-white', 'hover:bg-slate-700', 'border-slate-700');
            backBtn.classList.add('bg-white', 'text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-50', 'border-slate-300');

        } else {
            sidebar.classList.remove('bg-white', 'border-slate-200');
            sidebar.classList.add('bg-slate-900', 'border-slate-800');
            header.classList.remove('bg-white', 'border-slate-200');
            header.classList.add('bg-slate-900', 'border-slate-800');
            
            header.querySelector('h2').classList.remove('text-slate-800');
            header.querySelector('h2').classList.add('text-slate-100');

            const backBtn = document.getElementById('btn-editor-back');
            backBtn.classList.remove('bg-white', 'text-slate-600', 'hover:text-slate-900', 'hover:bg-slate-50', 'border-slate-300');
            backBtn.classList.add('bg-slate-800', 'text-slate-300', 'hover:text-white', 'hover:bg-slate-700', 'border-slate-700');
        }

        // Editor Tools BG
        const toolsBg = document.getElementById('editor-tools-bg');
        const genBox = document.getElementById('editor-gen-box');
        const inputs = document.querySelectorAll('#editor-gen-box input, #editor-gen-box select');
        
        if (isDay) {
            toolsBg.classList.remove('bg-slate-950', 'border-slate-800');
            toolsBg.classList.add('bg-slate-100', 'border-slate-200');
            
            genBox.classList.remove('bg-slate-950', 'border-slate-800');
            genBox.classList.add('bg-slate-100', 'border-slate-200');
            
            inputs.forEach(el => {
                el.classList.remove('bg-slate-900', 'border-slate-700', 'text-white', 'text-slate-300');
                el.classList.add('bg-white', 'border-slate-300', 'text-slate-800');
            });
        } else {
            toolsBg.classList.remove('bg-slate-100', 'border-slate-200');
            toolsBg.classList.add('bg-slate-950', 'border-slate-800');
            
            genBox.classList.remove('bg-slate-100', 'border-slate-200');
            genBox.classList.add('bg-slate-950', 'border-slate-800');
            
            inputs.forEach(el => {
                el.classList.remove('bg-white', 'border-slate-300', 'text-slate-800');
                el.classList.add('bg-slate-900', 'border-slate-700', 'text-white');
            });
        }

        // Modal Boxes (Victory / Game Over)
        const victoryBox = document.getElementById('box-victory');
        const gameoverBox = document.getElementById('box-gameover');
        const vicTitle = document.getElementById('victory-title');
        const goTitle = document.getElementById('gameover-title');
        const vicTime = document.getElementById('victory-time');

        if (isDay) {
            // Light Mode Modals
            [victoryBox, gameoverBox].forEach(b => {
                b.classList.remove('bg-slate-900', 'border-yellow-500/20', 'border-red-500/50');
                b.classList.add('bg-white', 'border-slate-200', 'shadow-xl');
            });
            vicTitle.classList.remove('text-white'); vicTitle.classList.add('text-slate-800');
            goTitle.classList.remove('text-white'); goTitle.classList.add('text-slate-800');
            
            vicTime.classList.remove('bg-slate-950', 'text-cyan-400', 'border-slate-800');
            vicTime.classList.add('bg-slate-100', 'text-cyan-600', 'border-slate-200');
        } else {
            // Dark Mode Modals
            [victoryBox, gameoverBox].forEach(b => {
                b.classList.remove('bg-white', 'border-slate-200', 'shadow-xl');
                b.classList.add('bg-slate-900');
            });
            victoryBox.classList.add('border-yellow-500/20');
            gameoverBox.classList.add('border-red-500/50');
            
            vicTitle.classList.remove('text-slate-800'); vicTitle.classList.add('text-white');
            goTitle.classList.remove('text-slate-800'); goTitle.classList.add('text-white');
            
            vicTime.classList.remove('bg-slate-100', 'text-cyan-600', 'border-slate-200');
            vicTime.classList.add('bg-slate-950', 'text-cyan-400', 'border-slate-800');
        }
    }
};

const Game = {
    running: false, is2D: false, isThirdPerson: false, mode: 'standard',
    map: [], w: 0, h: 0,
    player: { x:1, z:1, dir: Math.PI },
    ghost: { x:1, z:1, path: [], timer: 0 },
    stepTimer: 0, lastTime: 0,

    init() {
        Input.init(); GFX.init(); Timer.init(); this.loop();
        MenuNav.init(); 
        document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => Sfx.click()));
        document.getElementById('inp-code').addEventListener('keyup', (e)=>{ if(e.key === 'Enter') this.start('code'); });
    },
    toggleTheme() {
        const mode = Theme.toggle();
        const icon = document.getElementById('icon-theme');
        if(mode === 'day') {
            icon.className = "ph ph-sun text-yellow-500";
        } else {
            icon.className = "ph ph-moon text-yellow-400";
        }
        GFX.applyTheme();
        UI.applyTheme();
    },
    setMode(m) {
        this.mode = m;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`mode-${m}`).classList.add('active');
    },
    spawnGhost(startX, startZ, endX, endZ) {
        let bestPos = {x: 1, y: 1};
        let maxDist = -1;
        for(let y=1; y<this.h-1; y++) {
            for(let x=1; x<this.w-1; x++) {
                if(this.map[y][x] !== CONST.WALL) {
                    const dStart = Math.abs(x - startX) + Math.abs(y - startZ);
                    const dEnd = Math.abs(x - endX) + Math.abs(y - endZ);
                    const score = Math.min(dStart, dEnd);
                    if(score > maxDist) { maxDist = score; bestPos = {x, y}; }
                }
            }
        }
        this.ghost.x = bestPos.x + 0.5;
        this.ghost.z = bestPos.y + 0.5;
        this.ghost.path = [];
        this.ghost.timer = 0;
    },
    start(difficulty) {
        Sfx.init(); 
        if (!GFX.scene) GFX.init(); 
        let w=15, h=15; let rng = Math.random;
        
        if (difficulty === 'code') {
            const rawCode = document.getElementById('inp-code').value.trim();
            const sizeVal = parseInt(document.getElementById('inp-size').value);
            if(!rawCode) return alert("Please enter a code!");
            const code = rawCode.toUpperCase();
            Seed.set(code); rng = Seed.rng; w = sizeVal; h = sizeVal;
            document.getElementById('ui-code-display').classList.remove('hidden');
            document.getElementById('ui-code-val').innerText = `${code} (${w}x${h})`;
        } else {
            Seed.reset();
            document.getElementById('ui-code-display').classList.add('hidden');
            if(difficulty==='easy'){w=11;h=11;} 
            if(difficulty==='medium'){w=25;h=25;} 
            if(difficulty==='hard'){w=51;h=51;}
            if(difficulty==='extreme'){w=101;h=101;}
        }
        
        if(difficulty==='custom') { this.map=JSON.parse(JSON.stringify(Editor.grid)); this.w=this.map[0].length; this.h=this.map.length; } 
        else { this.map = MazeGen.generate(w, h, rng); this.w=w; this.h=h; }
        
        let found=false;
        for(let z=0;z<this.h;z++) for(let x=0;x<this.w;x++) if(this.map[z][x]===CONST.START) { this.player.x=x+0.5; this.player.z=z+0.5; found=true; }
        if(!found){this.player.x=1.5;this.player.z=1.5;}

        const startX = Math.floor(this.player.x);
        const startZ = Math.floor(this.player.z);
        let endX=1, endZ=1;
        for(let z=0;z<this.h;z++) for(let x=0;x<this.w;x++) if(this.map[z][x]===CONST.END) { endX=x; endZ=z; }
        
        const isPath = (x, z) => (x>=0 && x<this.w && z>=0 && z<this.h && this.map[z][x] !== CONST.WALL);
        let startDir = Math.PI;
        if (isPath(startX, startZ - 1)) startDir = 0;           
        else if (isPath(startX, startZ + 1)) startDir = Math.PI; 
        else if (isPath(startX - 1, startZ)) startDir = Math.PI/2; 
        else if (isPath(startX + 1, startZ)) startDir = -Math.PI/2; 
        this.player.dir = startDir;

        if (this.mode === 'ghost') {
            this.spawnGhost(startX, startZ, endX, endZ);
        }
        
        let limit = 0;
        if (this.mode === 'time') {
            limit = Math.floor((w * h) / 3); 
            if (limit < 30) limit = 30; 
        }

        GFX.build(this.map, this.w, this.h);
        document.querySelectorAll('.ui-screen').forEach(e => e.classList.add('hidden'));
        document.getElementById('screen-game').classList.remove('hidden');
        document.getElementById('screen-game').classList.add('flex');
        
        this.is2D = false;
        this.isThirdPerson = false;
        GFX.snapCamera = true;
        
        this.running=true;
        Timer.start(this.mode, limit);
        this.lastTime = Date.now();
        this.updateUI();
    },
    toggleDimension() { 
        this.is2D = !this.is2D;
        if (!this.is2D) GFX.snapCamera = true;
        this.updateUI(); 
    },
    toggleCamera() {
        if(this.is2D) return;
        this.isThirdPerson = !this.isThirdPerson;
        GFX.snapCamera = true;
        this.updateUI();
    },
    updateUI() {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        document.getElementById('c3d').style.display = !this.is2D ? 'block' : 'none';
        document.getElementById('c2d').style.display = this.is2D ? 'block' : 'none';
        document.getElementById('minimap-wrapper').style.display = !this.is2D ? 'block' : 'none';
        
        // Toggle 2D view class for CSS styling (Timer position)
        if (this.is2D) {
            document.body.classList.add('view-2d');
        } else {
            document.body.classList.remove('view-2d');
        }

        const dict = Lang.data[Lang.current];
        const dimIcon = this.is2D ? 'ph-cube' : 'ph-map-trifold';
        const dimText = this.is2D ? dict.view_3d : dict.view_2d;
        document.getElementById('icon-dim').className = `ph ${dimIcon} text-lg`;
        document.getElementById('lbl-dim').innerText = dimText;

        const povBtn = document.getElementById('btn-pov');
        if (this.is2D) {
            povBtn.classList.add('opacity-50', 'grayscale');
            povBtn.classList.remove('active:scale-95');
        } else {
            povBtn.classList.remove('opacity-50', 'grayscale');
            povBtn.classList.add('active:scale-95');
        }
        const povIcon = this.isThirdPerson ? 'ph-eye' : 'ph-person';
        const povText = this.isThirdPerson ? dict.view_1st : dict.view_3rd;
        document.getElementById('icon-pov').className = `ph ${povIcon} text-lg`;
        document.getElementById('lbl-pov').innerText = povText;
        
        document.getElementById('controls-ui').style.display = isMobile ? 'block' : 'none';
    },
    updateGhost(dt) {
        if (this.mode !== 'ghost') return;
        
        this.ghost.timer += dt;
        if (this.ghost.timer > 0.5) {
            this.ghost.timer = 0;
            const startNode = {x: Math.floor(this.ghost.x), y: Math.floor(this.ghost.z)};
            const endNode = {x: Math.floor(this.player.x), y: Math.floor(this.player.z)};
            this.ghost.path = Pathfinding.findPath(this.map, startNode, endNode, this.w, this.h);
        }

        if (this.ghost.path && this.ghost.path.length > 0) {
            const target = this.ghost.path[0];
            const tx = target.x + 0.5;
            const tz = target.y + 0.5;
            
            const dx = tx - this.ghost.x;
            const dz = tz - this.ghost.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < 0.1) {
                this.ghost.path.shift(); 
            } else {
                // FIX: Use faster speed in 2D mode
                const speed = this.is2D ? CONST.GHOST_SPEED_2D : CONST.GHOST_SPEED;
                const moveDist = speed * dt;
                
                this.ghost.x += (dx / dist) * moveDist;
                this.ghost.z += (dz / dist) * moveDist;
            }
        }
        
        const pdx = this.player.x - this.ghost.x;
        const pdz = this.player.z - this.ghost.z;
        if (Math.sqrt(pdx*pdx + pdz*pdz) < 0.8) {
            this.gameOver("Ghost Caught You!");
        }
    },
    loop() {
        requestAnimationFrame(()=>this.loop());
        if(!this.running) return;
        
        const now = Date.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); 
        this.lastTime = now;

        const input = Input.get(!this.is2D);
        
        if(!this.is2D) {
            this.player.dir += input.rot * CONST.ROT_SPEED * dt;
            if(Math.abs(input.dz) > 0.05) {
                const speed = input.dz * CONST.SPEED_3D * dt;
                const dx = -Math.sin(this.player.dir) * speed;
                const dz = -Math.cos(this.player.dir) * speed;
                this.move(dx, dz);
                
                if(now - this.stepTimer > 400) {
                    Sfx.step();
                    this.stepTimer = now;
                }
            }
        } else {
            if(Math.abs(input.dx)>0.05 || Math.abs(input.dz)>0.05) {
                const dx = input.dx * CONST.SPEED_2D * dt;
                const dz = input.dz * CONST.SPEED_2D * dt;
                this.move(dx, dz);
                if(dx!==0 || dz!==0) this.player.dir = Math.atan2(dx, -dz);
            }
        }
        
        this.updateGhost(dt);

        const gx=Math.floor(this.player.x), gz=Math.floor(this.player.z);
        if(this.map[gz][gx]===CONST.END) {
            this.running=false;
            const finalTime = Timer.stop();
            document.getElementById('victory-time').innerText = finalTime;
            document.getElementById('screen-victory').classList.remove('hidden');
            document.getElementById('screen-victory').classList.add('flex');
            document.getElementById('minimap-wrapper').style.display='none';
            document.getElementById('controls-ui').style.display='none';
            Sfx.win();
        }
        
        if(!this.is2D) { 
            GFX.render(this.player, this.is2D, this.isThirdPerson, this.ghost); 
            GFX.render2D(this.map, this.w, this.h, this.player, this.ghost, 'minimap'); 
        } else {
            GFX.render2D(this.map, this.w, this.h, this.player, this.ghost, 'c2d');
        }
    },
    move(dx, dz) {
        let nextX = this.player.x + dx;
        let nextZ = this.player.z + dz;
        if (!this.col(nextX, this.player.z)) {
            this.player.x = nextX;
        } else {
            if (Math.abs(dz) < 0.01) {
                    const gridZ = Math.floor(this.player.z);
                    const distToTop = this.player.z - gridZ;
                    const distToBottom = (gridZ + 1) - this.player.z;
                    if (distToTop < 0.3 && !this.col(nextX, gridZ - 0.5)) this.player.z -= 0.05;
                    if (distToBottom < 0.3 && !this.col(nextX, gridZ + 1.5)) this.player.z += 0.05;
            }
        }
        if (!this.col(this.player.x, nextZ)) {
            this.player.z = nextZ;
        } else {
                if (Math.abs(dx) < 0.01) {
                    const gridX = Math.floor(this.player.x);
                    const distToLeft = this.player.x - gridX;
                    const distToRight = (gridX + 1) - this.player.x;
                    if (distToLeft < 0.3 && !this.col(gridX - 0.5, nextZ)) this.player.x -= 0.05;
                    if (distToRight < 0.3 && !this.col(gridX + 1.5, nextZ)) this.player.x += 0.05;
                }
        }
        if (this.col(this.player.x, this.player.z)) {
                const cx = Math.floor(this.player.x) + 0.5;
                const cz = Math.floor(this.player.z) + 0.5;
                this.player.x += (cx - this.player.x) * 0.1;
                this.player.z += (cz - this.player.z) * 0.1;
        }
    },
    col(x, z) {
        const r = CONST.COLLISION_RADIUS;
        const points = [{x: x-r, z: z-r}, {x: x+r, z: z-r}, {x: x-r, z: z+r}, {x: x+r, z: z+r}];
        for(let p of points) {
            const cx = Math.floor(p.x);
            const cz = Math.floor(p.z);
            if(cx < 0 || cx >= this.w || cz < 0 || cz >= this.h) return true;
            if(this.map[cz][cx] === CONST.WALL) return true;
        }
        return false;
    },
    gameOver(reason) {
        this.running = false;
        Timer.stop();
        Sfx.loss();
        document.getElementById('fail-reason').innerText = reason;
        document.getElementById('screen-gameover').classList.remove('hidden');
        document.getElementById('screen-gameover').classList.add('flex');
        document.getElementById('minimap-wrapper').style.display='none';
        document.getElementById('controls-ui').style.display='none';
    },
    quit() {
        this.running=false; Timer.reset();
        document.querySelectorAll('.ui-screen').forEach(e => e.classList.add('hidden'));
        document.getElementById('screen-menu').classList.remove('hidden');
        document.getElementById('minimap-wrapper').style.display='none';
        document.getElementById('controls-ui').style.display='none';
    }
};

const Editor = {
    grid: [], size: 10, tool: 1, isDrawing: false, zoom: 1.0, mode: 'draw',
    open() {
        if(this.grid.length === 0) this.resize(this.size);
        document.getElementById('screen-menu').classList.add('hidden');
        document.getElementById('screen-editor').classList.remove('hidden');
        document.getElementById('screen-editor').classList.add('flex');
        this.updateUI(); // FIX: Added call to updateUI to show correct button state
        setTimeout(()=>this.render(), 10);
        const vp = document.getElementById('editor-grid');
        const handleStart = (e) => {
            if(this.mode === 'pan') return; 
            e.preventDefault();
            this.isDrawing = true; this.handleInput(e);
            vp.setPointerCapture(e.pointerId);
        };
        const handleMove = (e) => {
            if(this.mode === 'pan') return;
            e.preventDefault();
            if(this.isDrawing) this.handleInput(e);
        };
        vp.onpointerdown = handleStart; vp.onpointermove = handleMove; vp.onpointerup = () => this.isDrawing = false;
    },
    close() {
        document.getElementById('screen-editor').classList.add('hidden');
        document.getElementById('screen-menu').classList.remove('hidden');
    },
    generateFromCode() {
        const code = document.getElementById('ed-code').value.trim();
        const size = parseInt(document.getElementById('ed-size').value);
        if(!code) return alert("Please enter a code");
        Seed.set(code.toUpperCase());
        this.grid = MazeGen.generate(size, size, Seed.rng);
        this.size = size;
        document.getElementById('lbl-size').innerText = `${this.size}x`;
        Seed.reset(); this.render();
    },
    setTool(t) { this.tool = t; this.updateUI(); },
    setMode(m) { 
        this.mode = m; 
        document.getElementById('editor-viewport').className = `flex-1 bg-grid-pattern relative p-4 md:p-8 mode-${m} overflow-hidden flex items-center justify-center`;
        this.updateUI();
    },
    updateUI() {
        document.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.remove('border-cyan-400', 'bg-slate-700');
            b.classList.add('bg-slate-800', 'border-transparent');
            b.querySelector('span').classList.remove('text-white');
            b.querySelector('span').classList.add('text-slate-400');
        });
        
        const activeBtn = document.getElementById('t-'+this.tool);
        activeBtn.classList.remove('bg-slate-800', 'border-transparent');
        activeBtn.classList.add('bg-slate-700', 'border-cyan-400');
        activeBtn.querySelector('span').classList.remove('text-slate-400');
        activeBtn.querySelector('span').classList.add('text-white');

        const drawBtn = document.getElementById('btn-mode-draw');
        const panBtn = document.getElementById('btn-mode-pan');
        
        if(this.mode === 'draw') {
            drawBtn.classList.add('bg-cyan-700', 'text-white');
            drawBtn.classList.remove('text-slate-400', 'hover:text-white');
            panBtn.classList.remove('bg-cyan-700', 'text-white');
            panBtn.classList.add('text-slate-400', 'hover:text-white');
        } else {
            panBtn.classList.add('bg-cyan-700', 'text-white');
            panBtn.classList.remove('text-slate-400', 'hover:text-white');
            drawBtn.classList.remove('bg-cyan-700', 'text-white');
            drawBtn.classList.add('text-slate-400', 'hover:text-white');
        }
    },
    resize(v) { 
        this.size = parseInt(v); 
        document.getElementById('lbl-size').innerText = `${this.size}x`; 
        this.grid = Array(this.size).fill().map((_,y)=>Array(this.size).fill().map((_,x)=>(x===0||y===0||x===this.size-1||y===this.size-1)?1:0));
        this.render(); 
    },
    setZoom(v) { this.zoom = parseFloat(v); this.render(); },
    clear() { this.resize(this.size); },
    handleInput(e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if(el && el.dataset.x) this.paint(parseInt(el.dataset.x), parseInt(el.dataset.y), el);
    },
    paint(x, y, el) {
        if(this.tool===2||this.tool===3) {
            this.grid.forEach((r,ry)=>r.forEach((_,rx)=>{ if(this.grid[ry][rx]===this.tool) { this.grid[ry][rx]=0; this.updateCell(rx,ry,0); } }));
        }
        this.grid[y][x] = this.tool;
        el.className = `grid-cell ${this.getClass(this.tool)}`;
    },
    updateCell(x, y, type) {
        const idx = y*this.size + x;
        const gridEl = document.getElementById('editor-grid');
        if(gridEl.children[idx]) gridEl.children[idx].className = `grid-cell ${this.getClass(type)}`;
    },
    getClass(t) { return t===1?'c-wall':t===3?'c-end':t===2?'c-start':'c-path'; },
    render() {
        const el = document.getElementById('editor-grid');
        el.innerHTML = '';
        const cellSize = Math.floor(16 * this.zoom); 
        el.style.gridTemplateColumns = `repeat(${this.size}, ${cellSize}px)`;
        el.style.width = 'fit-content'; 
        const frag = document.createDocumentFragment();
        for(let y=0; y<this.size; y++) for(let x=0; x<this.size; x++) {
            const d = document.createElement('div');
            d.style.width = `${cellSize}px`;
            d.style.height = `${cellSize}px`;
            d.className = `grid-cell ${this.getClass(this.grid[y][x])}`;
            d.dataset.x = x; d.dataset.y = y;
            frag.appendChild(d);
        }
        el.appendChild(frag);
    }
};

window.onload = () => Game.init();