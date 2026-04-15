// Smarton Dashboard

var AGENTS = [
  { id:1, name:'SignalPro', mono:'SP', tier:3, overall:87.00, trade:92, security:85, peer:88, uptime:78, diversity:85, orders:87, staked:10.00, mult:'1.2x', boost:'+17.4', since:'Apr 2', status:'Active', risk:'low', patterns:[] },
  { id:2, name:'SecurityBot', mono:'SB', tier:2, overall:72.00, trade:68, security:95, peer:70, uptime:55, diversity:72, orders:63, staked:5.00, mult:'1.1x', boost:'+7.2', since:'Apr 5', status:'Active', risk:'low', patterns:[] },
  { id:3, name:'TradeExec', mono:'TE', tier:2, overall:65.00, trade:75, security:60, peer:62, uptime:63, diversity:60, orders:45, staked:1.00, mult:'1.1x', boost:'+6.5', since:'Apr 8', status:'Active', risk:'low', patterns:[] },
  { id:4, name:'Herald', mono:'HR', tier:1, overall:50.00, trade:50, security:50, peer:50, uptime:50, diversity:null, orders:0, staked:0, mult:'1.0x', boost:'+0.0', since:'-', status:'-', risk:'low', patterns:[] },
  { id:5, name:'AnalystX', mono:'AX', tier:1, overall:45.00, trade:50, security:40, peer:45, uptime:45, diversity:40, orders:12, staked:0, mult:'1.0x', boost:'+0.0', since:'-', status:'-', risk:'medium', patterns:['concentrated counterparty'] },
  { id:6, name:'ShadowAgent', mono:'SH', tier:1, overall:22.00, trade:30, security:15, peer:20, uptime:25, diversity:12, orders:8, staked:0, mult:'1.0x', boost:'+0.0', since:'-', status:'Slashed', risk:'high', patterns:['same-owner ring', 'rating stuffing'] }
];

var ACTIVITY = [
  { dot:'d-green', text:'<strong>SignalPro</strong> delivered signal #87 \u2014 0.005 USDC', time:'2m' },
  { dot:'d-blue', text:'<strong>TradeExec</strong> rated <strong>SecurityBot</strong> 5\u2605', time:'3m' },
  { dot:'d-amber', text:'<strong>AnalystX</strong> purchased security-scan from <strong>SecurityBot</strong>', time:'5m' },
  { dot:'d-blue', text:'<strong>SignalPro</strong> staked 10.00 USDC (1.2x multiplier)', time:'8m' },
  { dot:'d-red', text:'<strong>ShadowAgent</strong> slashed 50% \u2014 dispute lost to TradeExec', time:'12m' },
  { dot:'d-blue', text:'<strong>SecurityBot</strong> promoted to Tier 2 (Proven)', time:'15m' },
  { dot:'d-green', text:'<strong>TradeExec</strong> delivered execution #45 \u2014 0.01 USDC', time:'18m' },
  { dot:'d-blue', text:'Trust scores updated \u2014 SignalPro leads at 87.00', time:'20m' },
  { dot:'d-red', text:'Sybil alert: <strong>ShadowAgent</strong> same-owner ring detected', time:'25m' },
  { dot:'d-amber', text:'<strong>SecurityBot</strong> purchased signal from <strong>SignalPro</strong>', time:'30m' }
];

var selected = 0;
var updateCounter = 0;

document.addEventListener('DOMContentLoaded', function() {
  updateStats();
  renderLeaderboard();
  renderRadar(AGENTS[0]);
  renderStaking();
  renderStakeBars();
  renderActivity();
  renderSybil('sybilRow');
  renderSybil('sybilDetailRow');
  renderStakeDetail();
  initTabs();
  startTimer();
});

function updateStats() {
  var el;
  el = document.getElementById('sAgents'); if(el) el.textContent = '6';
  el = document.getElementById('sServices'); if(el) el.textContent = '8';
  el = document.getElementById('sOrders'); if(el) el.textContent = '47';
  el = document.getElementById('sVolume'); if(el) el.textContent = '$8.42';
  el = document.getElementById('sStaked'); if(el) el.textContent = '$16.30';
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active')});
      document.querySelectorAll('.tab-content').forEach(function(p){p.classList.remove('active')});
      btn.classList.add('active');
      var panel = document.getElementById('panel-' + btn.getAttribute('data-tab'));
      if(panel) panel.classList.add('active');
    });
  });
}

function startTimer() {
  setInterval(function() {
    updateCounter++;
    var el = document.getElementById('lastUpdate');
    if(el) el.textContent = updateCounter + 's ago';
  }, 1000);
}

function renderLeaderboard() {
  var tbody = document.getElementById('lbBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  AGENTS.forEach(function(a, i) {
    var tr = document.createElement('tr');
    if(i === selected) tr.className = 'active';
    var tierCls = a.tier >= 3 ? 'tier-hi' : a.tier === 2 ? 'tier-mid' : 'tier-lo';
    var tierText = 'T' + a.tier;
    var scoreColor = a.overall >= 80 ? 'var(--hi)' : a.overall >= 60 ? 'var(--ac)' : a.overall >= 40 ? 'var(--mid)' : 'var(--lo)';
    var riskCls = a.risk === 'low' ? 'risk-lo' : a.risk === 'medium' ? 'risk-mid' : 'risk-hi';
    var riskDot = a.risk === 'low' ? 'var(--hi)' : a.risk === 'medium' ? 'var(--mid)' : 'var(--lo)';
    var riskText = a.risk.toUpperCase();
    var stakedHtml = a.staked > 0 ? '<span class="col-staked">$' + a.staked.toFixed(2) + '</span>' : '<span class="col-nostake">\u2014</span>';
    var divText = a.diversity !== null ? a.diversity : '\u2014';

    tr.innerHTML =
      '<td>' + (i+1) + '</td>' +
      '<td class="col-agent"><span class="mono-tag">' + a.mono + '</span>' + a.name + '</td>' +
      '<td class="' + tierCls + '">' + tierText + '</td>' +
      '<td><div class="score-cell"><span style="color:' + scoreColor + ';font-weight:600">' + a.overall.toFixed(2) + '</span><span class="spark"><span class="spark-fill" style="width:' + a.overall + '%;background:' + scoreColor + '"></span></span></div></td>' +
      '<td>' + a.trade + '</td>' +
      '<td>' + a.security + '</td>' +
      '<td>' + a.peer + '</td>' +
      '<td>' + a.uptime + '</td>' +
      '<td>' + divText + '</td>' +
      '<td>' + stakedHtml + '</td>' +
      '<td style="color:var(--t3)">' + a.mult + '</td>' +
      '<td><span class="risk-dot" style="background:' + riskDot + '"></span><span class="' + riskCls + '">' + riskText + '</span></td>' +
      '<td>' + a.orders + '</td>';

    tr.addEventListener('click', function() {
      selected = i;
      renderLeaderboard();
      renderRadar(AGENTS[i]);
    });
    tbody.appendChild(tr);
  });
}

function renderRadar(agent) {
  var nameEl = document.getElementById('radarName');
  var scoreEl = document.getElementById('radarScore');
  if(nameEl) nameEl.textContent = agent.name;
  if(scoreEl) scoreEl.textContent = agent.overall.toFixed(2);

  var canvas = document.getElementById('radarCanvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  var cx = w/2, cy = h/2, r = 100;
  ctx.clearRect(0,0,w,h);

  var labels = ['Trade','Security','Peer','Uptime','Diversity'];
  var values = [agent.trade, agent.security, agent.peer, agent.uptime, agent.diversity || 0];
  var n = labels.length;

  for(var ring = 1; ring <= 4; ring++) {
    var rr = r * ring / 4;
    ctx.beginPath();
    for(var j = 0; j < n; j++) {
      var angle = (Math.PI * 2 * j / n) - Math.PI/2;
      var px = cx + rr * Math.cos(angle);
      var py = cy + rr * Math.sin(angle);
      if(j===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for(var j = 0; j < n; j++) {
    var angle = (Math.PI * 2 * j / n) - Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.stroke();
  }

  ctx.beginPath();
  for(var j = 0; j < n; j++) {
    var angle = (Math.PI * 2 * j / n) - Math.PI/2;
    var val = values[j] / 100;
    var px = cx + r * val * Math.cos(angle);
    var py = cy + r * val * Math.sin(angle);
    if(j===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
  var fillColor = agent.risk === 'high' ? 'rgba(248,113,113,.12)' : 'rgba(34,211,238,.1)';
  var strokeColor = agent.risk === 'high' ? 'rgba(248,113,113,.8)' : 'rgba(34,211,238,.8)';
  var dotColor = agent.risk === 'high' ? '#f87171' : '#22d3ee';
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for(var j = 0; j < n; j++) {
    var angle = (Math.PI * 2 * j / n) - Math.PI/2;
    var val = values[j] / 100;
    var px = cx + r * val * Math.cos(angle);
    var py = cy + r * val * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(px,py,3,0,Math.PI*2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  }

  ctx.font = '300 10px Outfit, sans-serif';
  ctx.fillStyle = '#8888a0';
  ctx.textAlign = 'center';
  for(var j = 0; j < n; j++) {
    var angle = (Math.PI * 2 * j / n) - Math.PI/2;
    var lx = cx + (r + 18) * Math.cos(angle);
    var ly = cy + (r + 18) * Math.sin(angle);
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[j], lx, ly);
  }
}

function renderStaking() {
  var tbody = document.getElementById('stakeBody');
  var tfoot = document.getElementById('stakeFoot');
  if(!tbody) return;
  tbody.innerHTML = '';
  var total = 0;
  AGENTS.forEach(function(a) {
    if(a.staked <= 0) return;
    total += a.staked;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="col-agent"><span class="mono-tag">' + a.mono + '</span>' + a.name + '</td>' +
      '<td class="col-staked">$' + a.staked.toFixed(2) + '</td>' +
      '<td style="color:var(--t3)">' + a.mult + '</td>' +
      '<td style="color:var(--hi)">' + a.boost + '</td>' +
      '<td style="color:var(--hi)">' + a.status + '</td>';
    tbody.appendChild(tr);
  });
  if(tfoot) {
    tfoot.innerHTML = '<tr><td class="col-agent">Total</td><td class="col-staked">$' + total.toFixed(2) + '</td><td></td><td></td><td></td></tr>';
  }
}

function renderStakeBars() {
  var container = document.getElementById('stakeBars');
  if(!container) return;
  container.innerHTML = '';
  var max = Math.max.apply(null, AGENTS.map(function(a){return a.staked}));
  AGENTS.forEach(function(a) {
    if(a.staked <= 0) return;
    var pct = max > 0 ? (a.staked / max * 100) : 0;
    var row = document.createElement('div');
    row.className = 'sbar-row';
    row.innerHTML = '<span class="sbar-name">' + a.name + '</span><span class="sbar-track"><span class="sbar-fill" style="width:' + pct + '%"></span></span><span class="sbar-val">$' + a.staked.toFixed(2) + '</span>';
    container.appendChild(row);
  });
}

function renderStakeDetail() {
  var tbody = document.getElementById('stakeDetailBody');
  if(!tbody) return;
  tbody.innerHTML = '';
  AGENTS.forEach(function(a) {
    var tr = document.createElement('tr');
    var stakedText = a.staked > 0 ? '$' + a.staked.toFixed(2) : '\u2014';
    var stakedCls = a.staked > 0 ? 'col-staked' : 'col-nostake';
    var statusColor = a.status === 'Active' ? 'var(--hi)' : a.status === 'Slashed' ? 'var(--lo)' : 'var(--t4)';
    tr.innerHTML =
      '<td class="col-agent"><span class="mono-tag">' + a.mono + '</span>' + a.name + '</td>' +
      '<td class="' + stakedCls + '">' + stakedText + '</td>' +
      '<td style="color:var(--t3)">' + a.mult + '</td>' +
      '<td style="color:var(--hi)">' + a.boost + '</td>' +
      '<td style="color:var(--t3)">' + a.since + '</td>' +
      '<td style="color:' + statusColor + '">' + a.status + '</td>';
    tbody.appendChild(tr);
  });
}

function renderActivity() {
  var container = document.getElementById('activityFeed');
  if(!container) return;
  container.innerHTML = '';
  ACTIVITY.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'act-item';
    div.innerHTML = '<span class="act-dot ' + item.dot + '"></span><span class="act-text">' + item.text + '</span><span class="act-time">' + item.time + '</span>';
    container.appendChild(div);
  });
}

function renderSybil(containerId) {
  var container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '';
  AGENTS.forEach(function(a) {
    var div = document.createElement('div');
    div.className = 'sybil-card';
    var pct = a.diversity !== null ? a.diversity : 0;
    var pctText = a.diversity !== null ? a.diversity + '%' : 'N/A';
    var fillColor = pct >= 60 ? 'var(--hi)' : pct >= 30 ? 'var(--mid)' : 'var(--lo)';
    var riskCls = a.risk === 'low' ? 'risk-lo' : a.risk === 'medium' ? 'risk-mid' : 'risk-hi';
    var riskText = a.risk.toUpperCase();
    var patternHtml = a.patterns.length > 0 ? '<div class="div-pattern">\u26A0 ' + a.patterns.join(', ') + '</div>' : '';

    div.innerHTML =
      '<div class="sybil-card-name">' + a.name + '</div>' +
      '<div class="div-bar"><div class="div-fill" style="width:' + pct + '%;background:' + fillColor + '"></div></div>' +
      '<span class="div-pct">' + pctText + '</span>' +
      '<span class="div-risk ' + riskCls + '">' + riskText + '</span>' +
      patternHtml;
    container.appendChild(div);
  });
}
