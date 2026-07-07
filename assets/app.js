/* justh.net — shared behaviour: i18n, scroll effects, hero canvas */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- i18n ---------- */
  var DICT = window.I18N || {en:{}};
  function store(lang){ try{ localStorage.setItem('justh-lang', lang); }catch(e){} }
  function load(){ try{ return localStorage.getItem('justh-lang'); }catch(e){ return null; } }

  /* snapshot the English text that lives in the markup itself */
  var origText = new Map();
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    origText.set(el, el.innerHTML);
  });

  function applyLang(lang){
    if(!DICT[lang]) lang = 'en';
    var d = DICT[lang];
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      var val = (d && d[key] !== undefined) ? d[key] : origText.get(el);
      if(val !== undefined) el.innerHTML = val;
    });
    document.querySelectorAll('.lang-btn').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
    store(lang);
  }
  document.querySelectorAll('.lang-btn').forEach(function(b){
    b.addEventListener('click', function(){ applyLang(b.getAttribute('data-lang')); });
  });
  applyLang(load() || 'en');

  /* ---------- year ---------- */
  var y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();

  /* ---------- nav shadow ---------- */
  var nav = document.getElementById('nav');
  function onScrollNav(){ if(nav) nav.classList.toggle('scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', onScrollNav, {passive:true});
  onScrollNav();

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduced){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    },{threshold:.15});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  /* ---------- animated counters ---------- */
  function animateCount(el){
    var target = parseInt(el.getAttribute('data-count'),10);
    if(reduced){ el.textContent = target; return; }
    var start = null, dur = 1400;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts-start)/dur, 1);
      p = 1 - Math.pow(1-p, 3);
      el.textContent = Math.round(target * p);
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if(counters.length){
    if('IntersectionObserver' in window){
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){ animateCount(e.target); cio.unobserve(e.target); }
        });
      },{threshold:.6});
      counters.forEach(function(el){ cio.observe(el); });
    } else { counters.forEach(animateCount); }
  }

  /* ---------- timeline: vertical rail (mobile) + snake path (wide) ---------- */
  var timeline = document.getElementById('timeline');
  if(timeline){
    var railFill = document.getElementById('railFill');
    var items = timeline.querySelectorAll('.tl-item');
    var nodes = timeline.querySelectorAll('.tl-node');

    var snakeSvg = null, snakeFill = null, snakeTotal = 0;
    var pts = [];

    function buildSnake(){
      var active = window.innerWidth >= 1100;
      if(!snakeSvg){
        snakeSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        snakeSvg.id = 'snakeSvg';
        var base = document.createElementNS('http://www.w3.org/2000/svg','path');
        base.setAttribute('class','snake-base');
        snakeFill = document.createElementNS('http://www.w3.org/2000/svg','path');
        snakeFill.setAttribute('class','snake-fill');
        snakeSvg.appendChild(base); snakeSvg.appendChild(snakeFill);
        timeline.insertBefore(snakeSvg, timeline.firstChild);
      }
      if(!active){ snakeSvg.style.display = 'none'; pts = []; onScrollTimeline(); return; }
      snakeSvg.style.display = 'block';
      var tr = timeline.getBoundingClientRect();
      snakeSvg.setAttribute('width', tr.width);
      snakeSvg.setAttribute('height', tr.height);
      pts = []; var nodeCum = [];
      var prev = null, len = 0, d = '';
      nodes.forEach(function(n){
        var r = n.getBoundingClientRect();
        var c = {x: r.left - tr.left + 9, y: r.top - tr.top + 9};
        if(!prev){
          d = 'M ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
          pts.push(c); nodeCum.push(0);
        } else if(Math.abs(c.y - prev.y) < 2){
          /* same row: straight horizontal segment */
          d += ' L ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
          len += Math.abs(c.x - prev.x);
          pts.push(c); nodeCum.push(len);
        } else {
          /* new row: extend to the right edge, drop down the frame, run back, drop into the node */
          var midY = c.y - 24;
          var xR = tr.width - 9;
          var w1 = {x: xR, y: prev.y}, w2 = {x: xR, y: midY}, w3 = {x: c.x, y: midY};
          d += ' L ' + w1.x.toFixed(1) + ' ' + w1.y.toFixed(1);
          len += Math.abs(w1.x - prev.x);
          d += ' L ' + w2.x.toFixed(1) + ' ' + w2.y.toFixed(1);
          len += (midY - prev.y);
          d += ' L ' + w3.x.toFixed(1) + ' ' + w3.y.toFixed(1);
          len += Math.abs(w3.x - w2.x);
          d += ' L ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
          len += (c.y - midY);
          pts.push(w1); pts.push(w2); pts.push(w3); pts.push(c); nodeCum.push(len);
        }
        prev = c;
      });
      timeline._nodeCum = nodeCum;
      snakeSvg.querySelector('.snake-base').setAttribute('d', d);
      snakeFill.setAttribute('d', d);
      snakeTotal = len;
      snakeFill.style.strokeDasharray = snakeTotal;
      onScrollTimeline();
    }

    var onScrollTimeline = function(){
      var rect = timeline.getBoundingClientRect();
      var trigger = window.innerHeight * 0.62;
      var progressY = Math.min(Math.max(trigger - rect.top, 0), rect.height);

      if(pts.length > 1){
        /* reveal path length up to progressY (path only moves right/left/down) */
        var reveal = 0;
        for(var i=1;i<pts.length;i++){
          var a = pts[i-1], b = pts[i];
          if(a.x !== b.x){                    /* horizontal segment */
            if(progressY >= a.y) reveal += Math.abs(b.x-a.x); else break;
          } else {                            /* vertical segment */
            if(progressY >= b.y) reveal += (b.y-a.y);
            else if(progressY > a.y){ reveal += (progressY-a.y); break; }
            else break;
          }
        }
        snakeFill.style.strokeDashoffset = snakeTotal - reveal;
        var nc = timeline._nodeCum || [];
        items.forEach(function(item, idx){
          item.classList.toggle('lit', nc[idx] !== undefined && nc[idx] <= reveal + 1);
        });
      } else {
        railFill.style.height = progressY + 'px';
        items.forEach(function(item){
          var r = item.getBoundingClientRect();
          item.classList.toggle('lit', r.top < trigger);
        });
      }
    };

    window.addEventListener('scroll', onScrollTimeline, {passive:true});
    window.addEventListener('resize', buildSnake);
    if('ResizeObserver' in window){
      new ResizeObserver(function(){ buildSnake(); }).observe(timeline);
    }
    window.addEventListener('load', buildSnake);
    buildSnake();
  }

  /* ---------- hero node network ---------- */
  var canvas = document.getElementById('nodes');
  if(canvas){
    var ctx = canvas.getContext('2d');
    var W, H, pts = [], N;
    var COBALT = '30,79,219';
    var resize = function(){
      W = canvas.width = canvas.offsetWidth * devicePixelRatio;
      H = canvas.height = canvas.offsetHeight * devicePixelRatio;
      N = Math.min(70, Math.floor(canvas.offsetWidth / 18));
      pts = [];
      for(var i=0;i<N;i++){
        pts.push({
          x: Math.random()*W, y: Math.random()*H,
          vx:(Math.random()-.5)*.28*devicePixelRatio,
          vy:(Math.random()-.5)*.28*devicePixelRatio,
          r:(Math.random()*1.6+1.1)*devicePixelRatio
        });
      }
    };
    window.addEventListener('resize', resize);
    resize();
    var scrollPar = 0;
    window.addEventListener('scroll', function(){
      scrollPar = window.scrollY * 0.25 * devicePixelRatio;
    }, {passive:true});
    var LINK = 130 * devicePixelRatio;
    var frame = function(){
      ctx.clearRect(0,0,W,H);
      ctx.save();
      ctx.translate(0, scrollPar * 0.4);
      for(var i=0;i<N;i++){
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if(p.x<0||p.x>W) p.vx*=-1;
        if(p.y<0||p.y>H) p.vy*=-1;
      }
      for(var i=0;i<N;i++){
        for(var j=i+1;j<N;j++){
          var dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
          var d=Math.sqrt(dx*dx+dy*dy);
          if(d<LINK){
            ctx.strokeStyle='rgba('+COBALT+','+(0.13*(1-d/LINK))+')';
            ctx.lineWidth=devicePixelRatio;
            ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();
          }
        }
      }
      for(var i=0;i<N;i++){
        ctx.fillStyle='rgba('+COBALT+',0.38)';
        ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,pts[i].r,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      if(!reduced) requestAnimationFrame(frame);
    };
    frame();
  }

  /* ---------- profile photo fallback ---------- */
  var photo = document.getElementById('profilePhoto');
  if(photo){
    photo.addEventListener('error', function(){
      var mono = document.createElement('div');
      mono.className = 'monogram';
      mono.textContent = 'GJ';
      photo.replaceWith(mono);
    });
  }
})();
