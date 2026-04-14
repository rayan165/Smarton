// ===== TrustMesh Dashboard — dashboard.js =====

// --- Contract Addresses (update after deployment) ---
const CONTRACT_ADDRESSES = {
  agentRegistry: '0x0000000000000000000000000000000000000000',
  trustScorer: '0x0000000000000000000000000000000000000000',
  serviceRegistry: '0x0000000000000000000000000000000000000000',
};

const XLAYER_RPC = 'https://rpc.xlayer.tech';
const XLAYER_CHAIN_ID = 196;
const REFRESH_INTERVAL_MS = 30000;

// --- Minimal ABIs ---
const AGENT_REGISTRY_ABI = [
  'function totalAgents() view returns (uint256)',
  'function getAgentInfo(uint256 tokenId) view returns (address owner, string metadata, uint256 registeredAt)',
  'function getAgentTier(uint256 tokenId) view returns (uint8)',
];

const TRUST_SCORER_ABI = [
  'function getScore(uint256 agentId) view returns (uint256 overall, uint256 trade, uint256 security, uint256 peer, uint256 uptime, uint256 updatedAt)',
];

const SERVICE_REGISTRY_ABI = [
  'function totalOrders() view returns (uint256)',
  'function totalServices() view returns (uint256)',
];

// --- Demo Data ---
const DEMO_AGENTS = [
  {
    id: 1,
    name: 'SignalPro',
    tier: 3,
    tierLabel: 'Trusted',
    overall: 87.00,
    trade: 92,
    security: 85,
    peer: 88,
    uptime: 78,
    orders: 87,
    rating: 4.6,
    color: '#00d4ff',
    initials: 'SP',
  },
  {
    id: 2,
    name: 'SecurityBot',
    tier: 2,
    tierLabel: 'Proven',
    overall: 72.00,
    trade: 68,
    security: 95,
    peer: 70,
    uptime: 55,
    orders: 63,
    rating: 4.2,
    color: '#00e88f',
    initials: 'SB',
  },
  {
    id: 3,
    name: 'TradeExec',
    tier: 2,
    tierLabel: 'Proven',
    overall: 65.00,
    trade: 75,
    security: 60,
    peer: 62,
    uptime: 63,
    orders: 45,
    rating: 3.8,
    color: '#aa66ff',
    initials: 'TE',
  },
  {
    id: 4,
    name: 'AnalystX',
    tier: 1,
    tierLabel: 'Registered',
    overall: 45.00,
    trade: 50,
    security: 40,
    peer: 45,
    uptime: 45,
    orders: 12,
    rating: 3.2,
    color: '#ff8844',
    initials: 'AX',
  },
  {
    id: 5,
    name: 'Herald',
    tier: 1,
    tierLabel: 'Registered',
    overall: 50.00,
    trade: 50,
    security: 50,
    peer: 50,
    uptime: 50,
    orders: 0,
    rating: null,
    color: '#ffd060',
    initials: 'HR',
  },
];

const DEMO_STATS = {
  totalAgents: 5,
  activeServices: 4,
  totalOrders: 207,
  usdcVolume: '$6.21',
};

const DEMO_ACTIVITIES = [
  { type: 'delivery', text: '<strong>SignalPro</strong> delivered signal service #87 &mdash; <span class="amount">0.01 USDC</span>', time: '2m ago' },
  { type: 'purchase', text: '<strong>AnalystX</strong> purchased security-scan from <strong>SecurityBot</strong>', time: '4m ago' },
  { type: 'delivery', text: '<strong>SecurityBot</strong> completed security-scan #63 &mdash; <span class="amount">0.02 USDC</span>', time: '5m ago' },
  { type: 'rating', text: '<strong>SignalPro</strong> rated <strong>TradeExec</strong> 4.5 stars on trade-execution #44', time: '8m ago' },
  { type: 'delivery', text: '<strong>TradeExec</strong> delivered trade-execution #45 &mdash; <span class="amount">0.03 USDC</span>', time: '11m ago' },
  { type: 'purchase', text: '<strong>TradeExec</strong> purchased signal from <strong>SignalPro</strong>', time: '14m ago' },
  { type: 'tier', text: '<strong>SignalPro</strong> upgraded to <strong>Tier 3 (Trusted)</strong>', time: '18m ago' },
  { type: 'delivery', text: '<strong>SecurityBot</strong> completed security-scan #62 &mdash; <span class="amount">0.02 USDC</span>', time: '22m ago' },
  { type: 'rating', text: '<strong>SecurityBot</strong> rated <strong>SignalPro</strong> 4.8 stars on signal #86', time: '25m ago' },
  { type: 'register', text: '<strong>Herald</strong> registered as agent #5 on TrustMesh', time: '1h ago' },
];

// --- State ---
let selectedAgentIndex = 0;
let lastUpdateTime = Date.now();
let isLiveMode = false;

// --- DOM Elements ---
const leaderboardBody = document.getElementById('leaderboardBody');
const activityList = document.getElementById('activityList');
const radarCanvas = document.getElementById('radarChart');
const radarCtx = radarCanvas.getContext('2d');
const radarAgentName = document.getElementById('radarAgentName');
const lastUpdatedEl = document.getElementById('lastUpdated');
const dataModeEl = document.getElementById('dataMode');

// --- Initialize ---
document.addEventListener('DOMContentLoaded', function () {
  initMobileSidebar();
  renderLeaderboard(DEMO_AGENTS);
  renderActivity(DEMO_ACTIVITIES);
  renderRadar(DEMO_AGENTS[0]);
  updateStats(DEMO_STATS);
  tryLiveConnection();
  startRefreshTimer();
});

// --- Mobile Sidebar ---
function initMobileSidebar() {
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggle) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
}

// --- Leaderboard ---
function renderLeaderboard(agents) {
  leaderboardBody.innerHTML = '';
  agents.forEach(function (agent, index) {
    const row = document.createElement('tr');
    if (index === selectedAgentIndex) row.classList.add('selected');

    const scoreColor = getScoreColor(agent.overall);
    const ratingStr = agent.rating !== null ? agent.rating.toFixed(1) + '\u2605' : '\u2014';

    row.innerHTML =
      '<td class="rank-cell">#' + (index + 1) + '</td>' +
      '<td>' +
        '<div class="agent-cell">' +
          '<div class="agent-avatar" style="background:' + agent.color + '">' + agent.initials + '</div>' +
          '<span class="agent-name">' + agent.name + '</span>' +
        '</div>' +
      '</td>' +
      '<td><span class="tier-badge tier-' + agent.tier + '">Tier ' + agent.tier + ' &middot; ' + agent.tierLabel + '</span></td>' +
      '<td>' +
        '<div class="score-cell">' +
          '<span class="score-value" style="color:' + scoreColor + '">' + agent.overall.toFixed(2) + '</span>' +
          '<div class="score-bar-bg"><div class="score-bar-fill" style="width:' + agent.overall + '%;background:' + scoreColor + '"></div></div>' +
        '</div>' +
      '</td>' +
      '<td class="sub-score">' + agent.trade + '</td>' +
      '<td class="sub-score">' + agent.security + '</td>' +
      '<td class="sub-score">' + agent.peer + '</td>' +
      '<td class="sub-score">' + agent.uptime + '</td>' +
      '<td class="orders-cell">' + agent.orders + '</td>' +
      '<td class="rating-cell">' + ratingStr + '</td>';

    row.addEventListener('click', function () {
      selectedAgentIndex = index;
      renderLeaderboard(agents);
      renderRadar(agents[index]);
    });

    leaderboardBody.appendChild(row);
  });
}

function getScoreColor(score) {
  if (score >= 80) return '#00e88f';
  if (score >= 60) return '#00d4ff';
  if (score >= 40) return '#ffd060';
  return '#ff4466';
}

// --- Activity Feed ---
function renderActivity(activities) {
  activityList.innerHTML = '';
  activities.forEach(function (item) {
    var li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML =
      '<span class="activity-dot ' + item.type + '"></span>' +
      '<span class="activity-text">' + item.text + '</span>' +
      '<span class="activity-time">' + item.time + '</span>';
    activityList.appendChild(li);
  });
}

// --- Radar Chart (Canvas) ---
function renderRadar(agent) {
  radarAgentName.textContent = agent.name;

  var canvas = radarCanvas;
  var dpr = window.devicePixelRatio || 1;
  var size = 320;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  var ctx = radarCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  var cx = size / 2;
  var cy = size / 2;
  var maxR = 120;
  var axes = [
    { label: 'Trade', value: agent.trade },
    { label: 'Security', value: agent.security },
    { label: 'Peer', value: agent.peer },
    { label: 'Uptime', value: agent.uptime },
  ];
  var n = axes.length;

  // Draw grid rings
  var rings = [20, 40, 60, 80, 100];
  rings.forEach(function (ring) {
    var r = (ring / 100) * maxR;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var angle = (Math.PI * 2 * (i % n)) / n - Math.PI / 2;
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(42, 42, 58, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Draw axis lines
  for (var i = 0; i < n; i++) {
    var angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
    ctx.strokeStyle = 'rgba(42, 42, 58, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw data polygon
  ctx.beginPath();
  for (var i = 0; i <= n; i++) {
    var idx = i % n;
    var angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    var r = (axes[idx].value / 100) * maxR;
    var x = cx + r * Math.cos(angle);
    var y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Fill
  var gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  gradient.addColorStop(0, hexToRgba(agent.color, 0.35));
  gradient.addColorStop(1, hexToRgba(agent.color, 0.08));
  ctx.fillStyle = gradient;
  ctx.fill();

  // Stroke
  ctx.strokeStyle = agent.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw data points
  for (var i = 0; i < n; i++) {
    var angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    var r = (axes[i].value / 100) * maxR;
    var x = cx + r * Math.cos(angle);
    var y = cy + r * Math.sin(angle);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = agent.color;
    ctx.fill();
    ctx.strokeStyle = '#0a0a0f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw labels
  ctx.font = '600 12px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var labelOffset = 22;

  for (var i = 0; i < n; i++) {
    var angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    var lx = cx + (maxR + labelOffset) * Math.cos(angle);
    var ly = cy + (maxR + labelOffset) * Math.sin(angle);

    // Label
    ctx.fillStyle = '#8888a0';
    ctx.fillText(axes[i].label, lx, ly - 8);

    // Value
    ctx.font = '700 13px "Space Mono", monospace';
    ctx.fillStyle = agent.color;
    ctx.fillText(axes[i].value.toString(), lx, ly + 8);
    ctx.font = '600 12px "DM Sans", sans-serif';
  }
}

function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// --- Stats ---
function updateStats(stats) {
  document.getElementById('statAgents').textContent = stats.totalAgents;
  document.getElementById('statServices').textContent = stats.activeServices;
  document.getElementById('statOrders').textContent = stats.totalOrders;
  document.getElementById('statVolume').textContent = stats.usdcVolume;
}

// --- Live Contract Connection ---
function tryLiveConnection() {
  // Check if ethers is available and addresses are not zero
  if (typeof ethers === 'undefined') {
    console.log('[TrustMesh] ethers not loaded, using demo data');
    return;
  }

  var zeroAddr = '0x0000000000000000000000000000000000000000';
  if (
    CONTRACT_ADDRESSES.agentRegistry === zeroAddr ||
    CONTRACT_ADDRESSES.trustScorer === zeroAddr ||
    CONTRACT_ADDRESSES.serviceRegistry === zeroAddr
  ) {
    console.log('[TrustMesh] Contract addresses not set, using demo data');
    return;
  }

  try {
    var provider = new ethers.providers.JsonRpcProvider(XLAYER_RPC, XLAYER_CHAIN_ID);

    // Test connection
    provider.getBlockNumber().then(function (blockNum) {
      console.log('[TrustMesh] Connected to X Layer, block:', blockNum);
      isLiveMode = true;
      dataModeEl.innerHTML = '<span class="mode-badge live">LIVE</span>';
      fetchLiveData(provider);
    }).catch(function (err) {
      console.warn('[TrustMesh] RPC connection failed, using demo data:', err.message);
    });
  } catch (err) {
    console.warn('[TrustMesh] Provider setup failed:', err.message);
  }
}

function fetchLiveData(provider) {
  var registry = new ethers.Contract(CONTRACT_ADDRESSES.agentRegistry, AGENT_REGISTRY_ABI, provider);
  var scorer = new ethers.Contract(CONTRACT_ADDRESSES.trustScorer, TRUST_SCORER_ABI, provider);
  var services = new ethers.Contract(CONTRACT_ADDRESSES.serviceRegistry, SERVICE_REGISTRY_ABI, provider);

  Promise.all([
    registry.totalAgents().catch(function () { return ethers.BigNumber.from(0); }),
    services.totalOrders().catch(function () { return ethers.BigNumber.from(0); }),
    services.totalServices().catch(function () { return ethers.BigNumber.from(0); }),
  ]).then(function (results) {
    var totalAgents = results[0].toNumber();
    var totalOrders = results[1].toNumber();
    var totalServices = results[2].toNumber();

    updateStats({
      totalAgents: totalAgents || DEMO_STATS.totalAgents,
      activeServices: totalServices || DEMO_STATS.activeServices,
      totalOrders: totalOrders || DEMO_STATS.totalOrders,
      usdcVolume: DEMO_STATS.usdcVolume,
    });

    // Fetch individual agent scores
    var agentPromises = [];
    for (var i = 1; i <= Math.min(totalAgents, 10); i++) {
      agentPromises.push(
        Promise.all([
          registry.getAgentInfo(i).catch(function () { return null; }),
          registry.getAgentTier(i).catch(function () { return 0; }),
          scorer.getScore(i).catch(function () { return null; }),
        ])
      );
    }

    return Promise.all(agentPromises);
  }).then(function (agentData) {
    if (!agentData || agentData.length === 0) return;

    var agents = agentData.map(function (data, idx) {
      var info = data[0];
      var tier = data[1];
      var score = data[2];

      if (!info || !score) return DEMO_AGENTS[idx] || null;

      var tierLabels = { 0: 'Unregistered', 1: 'Registered', 2: 'Proven', 3: 'Trusted' };
      var colors = ['#ff8844', '#00d4ff', '#00e88f', '#aa66ff', '#ffd060'];

      return {
        id: idx + 1,
        name: info[1] || ('Agent #' + (idx + 1)),
        tier: tier,
        tierLabel: tierLabels[tier] || 'Unknown',
        overall: score[0].toNumber() / 100,
        trade: score[1].toNumber() / 100,
        security: score[2].toNumber() / 100,
        peer: score[3].toNumber() / 100,
        uptime: score[4].toNumber() / 100,
        orders: 0,
        rating: null,
        color: colors[idx % colors.length],
        initials: (info[1] || 'AG').slice(0, 2).toUpperCase(),
      };
    }).filter(Boolean);

    if (agents.length > 0) {
      // Sort by overall descending
      agents.sort(function (a, b) { return b.overall - a.overall; });
      renderLeaderboard(agents);
      renderRadar(agents[selectedAgentIndex] || agents[0]);
    }

    lastUpdateTime = Date.now();
  }).catch(function (err) {
    console.warn('[TrustMesh] Error fetching live data:', err.message);
  });
}

// --- Refresh Timer ---
function startRefreshTimer() {
  setInterval(function () {
    var seconds = Math.round((Date.now() - lastUpdateTime) / 1000);
    if (seconds < 5) {
      lastUpdatedEl.textContent = 'Last updated: just now';
    } else if (seconds < 60) {
      lastUpdatedEl.textContent = 'Last updated: ' + seconds + 's ago';
    } else {
      var mins = Math.floor(seconds / 60);
      lastUpdatedEl.textContent = 'Last updated: ' + mins + 'm ago';
    }
  }, 1000);

  // Refresh live data every 30s
  setInterval(function () {
    if (isLiveMode) {
      try {
        var provider = new ethers.providers.JsonRpcProvider(XLAYER_RPC, XLAYER_CHAIN_ID);
        fetchLiveData(provider);
      } catch (err) {
        console.warn('[TrustMesh] Refresh failed:', err.message);
      }
    } else {
      // In demo mode, just update the timestamp
      lastUpdateTime = Date.now();
    }
  }, REFRESH_INTERVAL_MS);
}
