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

  /* ---------- timeline rail ---------- */
  var timeline = document.getElementById('timeline');
  if(timeline){
    var railFill = document.getElementById('railFill');
    var items = timeline.querySelectorAll('.tl-item');
    var onScrollTimeline = function(){
      var rect = timeline.getBoundingClientRect();
      var trigger = window.innerHeight * 0.62;
      var progress = Math.min(Math.max(trigger - rect.top, 0), rect.height);
      railFill.style.height = progress + 'px';
      items.forEach(function(item){
        var r = item.getBoundingClientRect();
        item.classList.toggle('lit', r.top < trigger);
      });
    };
    window.addEventListener('scroll', onScrollTimeline, {passive:true});
    window.addEventListener('resize', onScrollTimeline);
    onScrollTimeline();
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
