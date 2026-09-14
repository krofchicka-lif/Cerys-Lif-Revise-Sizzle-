/* Ported verbatim from the old LIF Sizzle (page 14 "Real Network Animation").
   Only adaptation: the canvas and ring size to this element's box instead of
   innerWidth/innerHeight, and ids are namespaced per instance. Behaviour,
   timing, easing, growth logic, pulses and reset are unchanged. */
(function () {
  var BRANDS = [
    { id: 'bn0', col: '#C4724A', init: 'J', label: 'Jody' },
    { id: 'bn1', col: '#C4A25A', init: 'M', label: 'Maya' },
    { id: 'bn2', col: '#D4604A', init: 'C', label: 'Claire' },
    { id: 'bn3', col: '#B89A6A', init: 'N', label: 'Nadia' },
    { id: 'bn4', col: '#9B7AC4', init: 'S', label: 'Sophie' },
    { id: 'bn5', col: '#5C7EA0', init: 'L', label: 'Lena' },
    { id: 'bn6', col: '#6B8C6B', init: 'R', label: 'Rachel' },
    { id: 'bn7', col: '#4A7C59', init: 'P', label: 'Priya' },
    { id: 'bn8', col: '#2D4A6B', init: 'S', label: 'Sam' },
    { id: 'bn9', col: '#5C8AE0', init: 'T', label: 'Taylor' },
    { id: 'bn10', col: '#B8961E', init: 'A', label: 'Amara' },
    { id: 'bn11', col: '#D4A840', init: 'M', label: 'Mia' },
    { id: 'bn12', col: '#C4724A', init: 'Z', label: 'Zara' },
    { id: 'bn13', col: '#C86030', init: 'B', label: 'Bea' },
    { id: 'bn14', col: '#C45A8C', init: 'I', label: 'Iris' },
    { id: 'bn15', col: '#8A7060', init: 'D', label: 'Dana' },
    { id: 'bn16', col: '#6B8C5A', init: 'A', label: 'Asha' },
    { id: 'bn17', col: '#C4724A', init: 'C', label: 'Cleo' }
  ];

  var CSS = '' +
    '.br{position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;}' +
    '.bn{position:absolute;width:28px;height:28px;border-radius:50%;overflow:visible;transform:translate(-50%,-50%) scale(0);display:flex;align-items:center;justify-content:center;transition:transform .55s cubic-bezier(.34,1.56,.64,1),opacity .55s ease;opacity:0;}' +
    '.bn.vis{transform:translate(-50%,-50%) scale(1);opacity:1;}' +
    '.bn-circle{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 14px rgba(0,0,0,.15);}' +
    '.bn-init{font-size:9px;font-weight:700;color:rgba(255,255,255,.9);font-family:Apercu,sans-serif;}' +
    '.bn-label{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;font-size:8px;font-weight:400;color:rgba(47,43,43,.55);white-space:nowrap;font-family:Apercu,sans-serif;}' +
    '.bp{position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--bcol);opacity:0;animation:bpulse 3s ease-in-out infinite;}' +
    '.bn.vis .bp{opacity:.45;}' +
    '@keyframes bpulse{0%,100%{transform:scale(1);opacity:.45;}50%{transform:scale(1.5);opacity:0;}}' +
    '.pr{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(47,43,43,.06);animation:prpulse 7s ease-in-out infinite;}' +
    '@keyframes prpulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6;}50%{transform:translate(-50%,-50%) scale(1.05);opacity:.2;}}';

  function makeOS(root) {
    return {
      canvas: null, ctx: null, W: 0, H: 0, cx: 0, cy: 0,
      nodes: [], pulses: [], counter: 0, brands: [], active: false, raf: null, last: null,
      BDATA: BRANDS.map(function (b) { return { id: b.id, col: b.col }; }),
      cstr: function (h, a) { var r = parseInt(h.slice(1, 3), 16) || 0, g = parseInt(h.slice(3, 5), 16) || 0, b = parseInt(h.slice(5, 7), 16) || 0; return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; },
      layout: function () {
        var R = Math.min(this.W, this.H) * 0.27, self = this;
        this.brands.forEach(function (b) {
          var ang = (b.angle - 90) * Math.PI / 180;
          b.x = self.cx + Math.cos(ang) * R; b.y = self.cy + Math.sin(ang) * R; b.ang = ang;
          var el = root.querySelector('#' + b.id);
          if (el) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; }
        });
      },
      init: function (c, w, h) {
        this.canvas = c; this.ctx = c.getContext('2d'); this.active = true;
        this.nodes = []; this.pulses = []; this.counter = 0; this.last = null;
        this.W = c.width = w; this.H = c.height = h;
        this.cx = this.W / 2; this.cy = this.H / 2;
        this.brands = this.BDATA.map(function (d, i) { return { id: d.id, chainCol: d.col, angle: i * 20, x: 0, y: 0, ang: 0, active: false, fireT: 999, fireInterval: 4 + Math.random() * 4 }; });
        this.layout();
        var order = [0, 4, 1, 2, 8, 9, 5, 6, 7, 3, 10, 11, 12, 13, 14, 15, 16, 17], self = this;
        // Sparse first (a few isolated people), then accumulate once the WITH LIF
        // copy lands. Timing only — reveal order and growth logic are unchanged.
        var sparse = parseInt(root.getAttribute('sparse-count') || root.sparseCount || '3', 10);
        var growAt = parseInt(root.getAttribute('grow-at') || root.growAt || '5600', 10);
        order.forEach(function (idx, i) {
          var t;
          if (i < sparse) t = i === 0 ? 200 : 200 + i * 1400;
          else t = growAt + (i - sparse) * 430;
          setTimeout(function () {
            if (!self.active) return;
            var b = self.brands[idx]; if (!b) return;
            b.active = true; b.fireT = (i < sparse ? 1.8 : 0.5) + Math.random() * 0.8;
            var el = root.querySelector('#' + b.id); if (el) el.classList.add('vis');
          }, t);
        });
        var loop = function (ts) {
          if (!self.active) return;
          if (!self.last) self.last = ts;
          var dt = Math.min((ts - self.last) / 1000, .05); self.last = ts;
          self.draw(dt);
          self.raf = requestAnimationFrame(loop);
        };
        this.raf = requestAnimationFrame(loop);
      },
      growFrom: function (brand, px, py, baseAng, depth) {
        if (!this.active || depth > 7) return;
        var n = Math.random() < 0.45 ? 1 : 2, self = this;
        for (var i = 0; i < n; i++) {
          var spread = Math.PI / (1.2 + depth * 0.2), ang = baseAng + (Math.random() - .5) * spread * 2;
          var dist = Math.max(22, (72 + Math.random() * 50) * Math.pow(0.75, depth));
          var nx = px + Math.cos(ang) * dist, ny = py + Math.sin(ang) * dist, mg = 45;
          if (nx < mg || nx > this.W - mg || ny < mg || ny > this.H - mg) continue;
          var r = Math.max(2.5, 8.5 - depth * 1.0), stopped = depth > 1 && Math.random() < 0.18;
          var node = { x: nx, y: ny, px: px, py: py, depth: depth, angle: ang, r: r, col: brand.chainCol, alpha: 0, lp: 0, pR: 0, pulsing: true, stopped: stopped };
          this.nodes.push(node);
          this.pulses.push({ fx: px, fy: py, tx: nx, ty: ny, col: brand.chainCol, p: 0, done: false });
          this.counter++;
          if (!stopped && depth < 7) (function (n2, a2) { setTimeout(function () { self.growFrom(brand, n2.x, n2.y, a2, depth + 1); }, 1500 + Math.random() * 2200); })(node, ang);
        }
      },
      draw: function (dt) {
        var c = this.ctx, W = this.W, H = this.H, cx = this.cx, cy = this.cy, self = this;
        c.fillStyle = 'rgba(253,252,248,0.22)'; c.fillRect(0, 0, W, H);
        this.brands.forEach(function (b) {
          if (!b.active) return;
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(b.x, b.y);
          c.strokeStyle = self.cstr(b.chainCol, 0.07); c.lineWidth = 0.8; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]);
        });
        this.nodes.forEach(function (n) {
          n.alpha = Math.min(1, n.alpha + dt * 1.4);
          if (n.lp < 1) n.lp = Math.min(1, n.lp + dt * 1.0);
          if (n.pulsing) { n.pR += dt * 42; if (n.pR > n.r * 7) n.pulsing = false; }
          if (n.lp > 0) { var tx = n.px + (n.x - n.px) * n.lp, ty = n.py + (n.y - n.py) * n.lp; c.beginPath(); c.moveTo(n.px, n.py); c.lineTo(tx, ty); c.strokeStyle = self.cstr(n.col, (n.stopped ? 0.06 : Math.max(0.04, .2 - n.depth * .02)) * n.alpha); c.lineWidth = Math.max(0.4, 1.8 - n.depth * .24); if (n.stopped) c.setLineDash([3, 5]); c.stroke(); c.setLineDash([]); }
          if (n.lp < 0.78) return;
          if (n.pulsing && n.pR > 0) { c.beginPath(); c.arc(n.x, n.y, n.pR, 0, Math.PI * 2); c.strokeStyle = self.cstr(n.col, Math.max(0, .2 * (1 - n.pR / (n.r * 7))) * n.alpha); c.lineWidth = 0.7; c.stroke(); }
          if (n.stopped) { c.beginPath(); c.arc(n.x, n.y, n.r, 0, Math.PI * 2); c.fillStyle = 'rgba(47,43,43,0.7)'; c.fill(); }
          else {
            var g2 = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 2.8); g2.addColorStop(0, self.cstr(n.col, .15 * n.alpha)); g2.addColorStop(1, self.cstr(n.col, 0));
            c.beginPath(); c.arc(n.x, n.y, n.r * 2.8, 0, Math.PI * 2); c.fillStyle = g2; c.fill();
            c.beginPath(); c.arc(n.x, n.y, n.r, 0, Math.PI * 2); c.fillStyle = self.cstr(n.col, (.75 - n.depth * .05) * n.alpha); c.fill();
            c.beginPath(); c.arc(n.x - n.r * .2, n.y - n.r * .25, n.r * .28, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.38)'; c.fill();
          }
        });
        this.pulses = this.pulses.filter(function (p) { return !p.done; });
        this.pulses.forEach(function (p) { p.p = Math.min(1, p.p + dt * .72); if (p.p >= 1) p.done = true; var x = p.fx + (p.tx - p.fx) * p.p, y = p.fy + (p.ty - p.fy) * p.p; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fillStyle = self.cstr(p.col, .7 * (1 - p.p * .3)); c.fill(); });
        this.brands.forEach(function (b) {
          if (!b.active) return;
          b.fireT -= dt;
          if (b.fireT <= 0) { b.fireT = b.fireInterval; self.growFrom(b, b.x, b.y, b.ang, 1); }
        });
      },
      stop: function () {
        this.active = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = null;
        root.querySelectorAll('.bn').forEach(function (el) { el.classList.remove('vis'); });
      }
    };
  }

  if (!customElements.get('os-net')) {
    customElements.define('os-net', class extends HTMLElement {
      connectedCallback() {
        var self = this;
        this.style.position = 'relative';
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';
        this.style.overflow = 'hidden';
        if (!this._built) {
          this._built = true;
          var uid = this._uid = 'os' + Math.random().toString(36).slice(2, 7);
          var ring = BRANDS.map(function (b) {
            return '<div class="bn" id="' + b.id + '" data-col="' + b.col + '">' +
              '<div class="bn-circle" style="background:' + b.col + ';"><span class="bn-init">' + b.init + '</span></div>' +
              '<div class="bn-label">' + b.label + '</div>' +
              '<div class="bp" style="--bcol:' + b.col + ';"></div></div>';
          }).join('');
          this.innerHTML =
            '<style>' + CSS + '</style>' +
            '<div class="pr" style="width:280px;height:280px;"></div>' +
            '<div class="pr" style="width:280px;height:280px;animation-delay:2.3s;"></div>' +
            '<div class="pr" style="width:280px;height:280px;animation-delay:4.6s;"></div>' +
            '<canvas id="' + uid + '" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;"></canvas>' +
            '<div class="br">' + ring + '</div>';
        }
        // Start (or restart) as soon as the element actually has a box. A zero-size
        // or remounted first connect must not permanently disable the animation.
        this._boot = function () {
          var w = self.clientWidth, h = self.clientHeight;
          if (!w || !h) return false;
          if (self._os && self._os.active) return true;
          self._os = makeOS(self);
          self._os.init(self.querySelector('#' + self._uid), w, h);
          return true;
        };
        var poll = function () {
          if (!self.isConnected) return;
          if (self._boot()) return;
          self._pollRaf = requestAnimationFrame(poll);
        };
        this._poll = poll;
        poll();
        if (window.ResizeObserver && !this._ro) {
          this._ro = new ResizeObserver(function () {
            if (!self.isConnected) return;
            var w = self.clientWidth, h = self.clientHeight;
            if (!w || !h) return;
            if (!self._os || !self._os.active) { self._boot(); return; }
            if (w === self._os.W && h === self._os.H) return;
            self._os.stop();
            self._os = makeOS(self);
            self._os.init(self.querySelector('#' + self._uid), w, h);
          });
          this._ro.observe(this);
        }
      }
      disconnectedCallback() {
        if (this._pollRaf) { cancelAnimationFrame(this._pollRaf); this._pollRaf = null; }
        if (this._os) this._os.stop();
        if (this._ro) { this._ro.disconnect(); this._ro = null; }
      }
    });
  }
})();
