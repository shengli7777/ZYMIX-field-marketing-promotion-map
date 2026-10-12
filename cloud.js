'use strict';

// Publishable key 可用于浏览器；访问权限由数据库的成员规则控制。
const cloudConfig = {
  url: 'https://mcpxosgqnuohgsegjhme.supabase.co',
  key: 'sb_publishable_b_RXyyXaKBtX2rBVflL51w_BexrbwBH'
};

async function cloudRequest(path, options = {}) {
  if (path.startsWith('/rest/')) await renewSession();
  let response;
  try {
    response = await fetch(cloudConfig.url + path, {
      ...options,
      headers: {
        apikey: cloudConfig.key,
        ...(cloudToken ? { Authorization: `Bearer ${cloudToken}` } : {}),
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  } catch {
    throw new Error('无法连接后台，请检查网络后重试。表单内容仍保留在这里。');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (payload?.code === '23505') throw new Error('这条记录已存在，请刷新后编辑原记录。');
    if (response.status === 401) throw new Error('登录未成功或已过期，请重新登录。');
    if (response.status === 403) throw new Error('当前账号没有访问权限，请检查成员名单和权限代码。');
    throw new Error(payload?.msg || payload?.message || payload?.error_description || '请求未完成，请稍后重试。');
  }
  return payload;
}

function showLogin() {
  if (cloudUser) {
    signOutWorkbench();
    return;
  }
  openModal('登录工作台', `
    <form id="loginForm">
      <label>邮箱<input name="email" type="email" autocomplete="username" required></label>
      <label>密码<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="note">使用刚才在 Authentication 中创建的账号。登录后查看团队真实反馈；同一标签页刷新后保持登录，关闭标签页后需要重新登录。团队可见最近活跃时间，不记录你的输入内容。</p>
      <p id="loginError" class="error" role="alert"></p>
      <button class="primary submit">登录</button>
    </form>`);
  $('#loginForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button');
    button.disabled = true;
    $('#loginError').textContent = '';
    try {
      const data = new FormData(form);
      const session = await cloudRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: data.get('email').trim(), password: data.get('password') })
      });
      rememberSession(session);
      const members = await cloudRequest('/rest/v1/team_members?select=user_id');
      if (!members?.some(member => member.user_id === session.user.id)) {
        throw new Error('账号已创建，但尚未加入工作台成员名单。');
      }
      await loadCloudData();
      cloudUser = session.user;
      enterTeamMode();
      $('#modal').close();
      $('#modalBody').replaceChildren();
      toast('已登录，已读取云端反馈');
    } catch (failure) {
      sessionStorage.removeItem(sessionKey);
      savedSession = null;
      cloudToken = null;
      cloudUser = null;
      $('#loginError').textContent = failure.message;
    } finally {
      button.disabled = false;
    }
  };
}

async function loadCloudData() {
  const [areas, feedback] = await Promise.all([
    readAllRows('areas', 'created_at.asc,id.asc'),
    readAllRows('activity_feedback', 'activity_date.desc,id.asc')
  ]);
  // 不把演示活动和浏览器中未保存的修改导入真实数据库。
  const nextPoints = [];
  for (const area of areas) {
    let point = nextPoints.find(item => item.name === area.name && area.city === 'London');
    if (!point) {
      point = {
        id: Math.max(0, ...nextPoints.map(item => item.id)) + 1,
        name: area.name, city: area.city,
        lat: area.latitude, lng: area.longitude, address: area.address_hint || "",
        type: area.venue_type || '待确认', indoor: area.environment_type || '待确认', permission: '待确认',
        group: 'candidate', paused: false, note: '',
        match: null, stop: null, access: null, weather: null
      };
      nextPoints.push(point);
    }
    point.permission = area.permission || '待确认';
    point.paused = area.paused || false;
    for (const field of ['match','stop','access','weather']) point[field] = area['rating_' + field] ?? null;
    point.hasRatings = ['match','stop','access','weather'].every(field => Number.isInteger(point[field]));
    point.cloudId = area.id;
    point.lat = area.latitude; point.lng = area.longitude;
    point.city = area.city;
    point.address = area.address_hint || ''; 
  }
  const nextRecords = feedback.map((row, index) => ({
    id: index + 1, cloudId: row.id,
    pid: nextPoints.find(point => point.cloudId === row.area_id)?.id,
    date: row.activity_date, time: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5),
    referralCode: row.referral_code, hours: Number(row.person_hours),
    cost: row.total_cost_gbp === null ? null : Number(row.total_cost_gbp),
    scans: row.scan_count, regs: row.registration_count, note: row.notes, state: '已完成'
  }));
  points.splice(0, points.length, ...nextPoints);
  records.splice(0, records.length, ...nextRecords);
}

async function ensureCloudArea(point) {
  if (point.cloudId) return point.cloudId;
  const payload = {
    city: point.city || 'London', name: point.name,
    latitude: point.lat ?? null, longitude: point.lng ?? null,
    address_hint: point.address || ""
  };
  // 冲突时保留现有区域，避免两名成员同时新增造成重复。
  await cloudRequest('/rest/v1/areas?on_conflict=city,name', {
    method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify(payload)
  });
  const query = new URLSearchParams({ select: 'id', city: `eq.${payload.city}`, name: `eq.${payload.name}` });
  const rows = await cloudRequest('/rest/v1/areas?' + query);
  if (!rows?.[0]) throw new Error('区域未保存成功，请重试。');
  point.cloudId = rows[0].id;
  return point.cloudId;
}

async function saveCloudFeedback(point, record, cloudId, scheduleId) {
  const areaId = await ensureCloudArea(point);
  const payload = {
    area_id: areaId, activity_date: record.date, referral_code: record.referralCode,
    start_time: record.time, end_time: record.endTime, person_hours: record.hours,
    total_cost_gbp: record.cost, scan_count: record.scans,
    registration_count: record.regs, notes: record.note
  };
  if (!cloudId && scheduleId) payload.schedule_id = scheduleId;
  const rows = await cloudRequest('/rest/v1/activity_feedback' + (cloudId ? `?id=eq.${cloudId}` : ''), {
    method: cloudId ? 'PATCH' : 'POST',
    headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload)
  });
  if (!rows?.[0]) throw new Error('未保存成功，请重新登录后重试。');
  return rows[0].id;
}


$('#loginBtn').onclick = showLogin;

// 正式模式仅收集需要保存的区域信息，避免把暂未接入的评分当作已保存。
const openDemoAdd = openAdd;
const cleanLocationText = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
const locationKey = value => cleanLocationText(value).toLocaleLowerCase('en-GB');
openAdd = function (lat = null, lng = null) {
  if (!cloudUser) return openDemoAdd(lat, lng);
  addMode = false;
  $('#mapMessage').hidden = true;
  const cities = ['London', 'Oxford', 'Cambridge', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow'];
  openModal('活动地点录入', `
    <form id="cloudAreaForm">
      <label>城市<select name="city">${cities.map(city => `<option>${city}</option>`).join('')}<option value="other">其他城市</option></select></label>
      <label id="otherCityLabel" hidden>填写城市<input name="otherCity" maxlength="80"></label>
      <label>具体地推地点<input name="name" placeholder="例如 Westgate、Chinatown" required maxlength="80"></label>
      <label>街道或邮编（选填）<input name="address" placeholder="例如 OX1 1TR" maxlength="200"></label>
      <label>场地类型<select name="venueType">${venueOptions(venueTypes)}</select></label>
      <label>环境类型<select name="environmentType">${venueOptions(environmentTypes)}</select></label>
      <div id="locationPreview" class="note" aria-live="polite"></div>
      <div id="locationMatches"></div>
      <button type="button" id="findLocation">查找地图位置</button>
      <div id="geoResults" aria-live="polite"></div>
      <p class="note">核对结果中的城市、街道和邮编，再选择位置。搜索会将地点文字发送给 Photon。位置数据 © OpenStreetMap contributors。</p>
      <p id="areaError" class="error" role="alert"></p>
      <button class="primary submit">保存地点</button>
    </form>`);
  const form = $('#cloudAreaForm');
  let chosenLocation = null;
  let searchVersion = 0;
  const cityValue = () => cleanLocationText(form.elements.city.value === 'other' ? form.elements.otherCity.value : form.elements.city.value);
  const usePoint = point => {
    $('#search').value = ''; $('#statusFilter').value = ''; $('#viewFilter').value = ''; $('#indoorFilter').value = '';
    $('#modal').close(); selectPoint(point.id);
  };
  const preview = () => {
    chosenLocation = null; searchVersion++;
    $('#geoResults').replaceChildren();
    const city = cityValue(), name = cleanLocationText(form.elements.name.value);
    $('#otherCityLabel').hidden = form.elements.city.value !== 'other';
    form.elements.otherCity.required = form.elements.city.value === 'other';
    $('#locationPreview').textContent = `${city || '待填城市'} · ${name || '待填地点'} — 地点待核对`;
    const matches = points.filter(point => locationKey(point.city || 'London') === locationKey(city) && name && locationKey(point.name).includes(locationKey(name)));
    $('#locationMatches').innerHTML = matches.map(point => `<button type="button" class="quiet" data-location="${point.id}">使用已有地点：${esc(point.name)}</button>`).join('');
    document.querySelectorAll('[data-location]').forEach(button => button.onclick = () => usePoint(points.find(point => point.id === Number(button.dataset.location))));
  };
  form.oninput = preview; form.onchange = preview; preview();
  $('#findLocation').onclick = async () => {
    const city = cityValue(), name = cleanLocationText(form.elements.name.value);
    if (!city || !name) { $('#areaError').textContent = '先填写城市和地点。'; return; }
    const version = ++searchVersion;
    chosenLocation = null;
    const button = $('#findLocation');
    button.disabled = true;
    $('#geoResults').textContent = '正在查找…';
    $('#areaError').textContent = '';
    try {
      const results = await searchLocations([name, form.elements.address.value.trim(), city, 'United Kingdom'].filter(Boolean).join(', '));
      if (version !== searchVersion || !form.isConnected) return;
      $('#geoResults').innerHTML = results.length ? results.map((result, index) => `<button type="button" class="geo-result" data-geo="${index}">${esc(result.label)}<br><small>${result.lat.toFixed(5)}, ${result.lng.toFixed(5)} · 点击选择</small></button>`).join('') : '<p>没有找到匹配地点。请尝试英文名称、补充街道或邮编后再查找。</p>';
      form.querySelectorAll('[data-geo]').forEach(item => item.onclick = () => {
        chosenLocation = results[Number(item.dataset.geo)];
        form.querySelectorAll('[data-geo]').forEach(option => option.classList.remove('selected-location'));
        item.classList.add('selected-location');
        $('#locationPreview').textContent = '已选择：' + chosenLocation.label;
      });
    } catch (failure) {
      if (version === searchVersion && form.isConnected) $('#geoResults').textContent = failure.message;
    } finally { button.disabled = false; }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    const button = form.querySelector('button.submit');
    const city = cityValue(), name = cleanLocationText(form.elements.name.value);
    const address = cleanLocationText(form.elements.address.value);
    if (!city || !name) { $('#areaError').textContent = '请填写城市和地点。'; return; }
    const existing = points.find(point => locationKey(point.city || 'London') === locationKey(city) && locationKey(point.name) === locationKey(name));
    if (existing && !chosenLocation) { usePoint(existing); toast('已选择已有地点'); return; }
    if (!chosenLocation) { $('#areaError').textContent = '请先查找地图位置，并点击一个匹配结果。'; return; }
    button.disabled = true;
    try {
      const id = await ensureCloudArea(existing || { city, name, address, lat: chosenLocation.lat, lng: chosenLocation.lng });
      const saved = await cloudRequest('/rest/v1/areas?id=eq.' + id, {
        method: 'PATCH', headers: {Prefer: 'return=representation'},
        body: JSON.stringify({latitude: chosenLocation.lat, longitude: chosenLocation.lng, address_hint: address || chosenLocation.label,
          ...(!existing ? {venue_type: form.elements.venueType.value, environment_type: form.elements.environmentType.value} : {})})
      });
      if (!saved?.length) throw new Error('位置未保存成功，请重试。');
      await loadCloudData();
      usePoint(points.find(point => point.cloudId === id));
      toast('地点和地图位置已保存');
      if (typeof openScreening === 'function') openScreening(points.find(item => item.cloudId === id));
    } catch (failure) {
      $('#areaError').textContent = failure.message;
    } finally { button.disabled = false; }
  };
};
const addDemoPoint = $('#addBtn').onclick;
$('#addBtn').onclick = () => cloudUser ? openAdd() : addDemoPoint();

async function readAllRows(table, order) {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const page = await cloudRequest(`/rest/v1/${table}?select=*&order=${order}&limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

// 只在用户点击时搜索；缓存相同查询，并限制连续请求。
const geocodeCache = new Map();
let lastGeocodeRequest = 0;
async function searchLocations(query) {
  const key = query.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  if (Date.now() - lastGeocodeRequest < 1500) throw new Error('请稍等两秒再搜索。');
  lastGeocodeRequest = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const params = new URLSearchParams({q: query, limit: '8', lang: 'en'});
    const response = await fetch('https://photon.komoot.io/api/?' + params, {signal: controller.signal});
    if (!response.ok) throw new Error('位置查询服务暂时不可用，请稍后重试。');
    const payload = await response.json();
    const results = (payload.features || []).filter(feature =>
      feature.properties?.countrycode?.toUpperCase() === 'GB' &&
      feature.geometry?.type === 'Point' &&
      Number.isFinite(feature.geometry.coordinates[0]) && Number.isFinite(feature.geometry.coordinates[1])
    ).map(feature => {
      const p = feature.properties;
      return {category: p.osm_value || "", categoryKey: p.osm_key || "", lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1],
        label: [...new Set([p.name, p.housenumber, p.street, p.district, p.city, p.county, p.postcode, p.country].filter(Boolean))].join(', ')};
    });
    geocodeCache.set(key, results);
    return results;
  } catch (failure) {
    throw new Error(failure.name === 'AbortError' ? '查找超时，请稍后再试。' : '位置查询失败，请检查网络或稍后重试。');
  } finally { clearTimeout(timer); }
}

async function saveCloudPointField(point, field, value) {
  const columns = {type:'venue_type',indoor:'environment_type',permission:'permission',paused:'paused',match:'rating_match',stop:'rating_stop',access:'rating_access',weather:'rating_weather'};
  if (!columns[field]) throw new Error('不支持的点位字段');
  const id = await ensureCloudArea(point);
  const rows = await cloudRequest('/rest/v1/areas?id=eq.' + id, {
    method:'PATCH', headers:{Prefer:'return=representation'},
    body:JSON.stringify({[columns[field]]:value})
  });
  if (!rows?.length) throw new Error('未保存成功，请重新登录后重试。');
}
async function saveCloudSchedule(point, record, owner, notes) {
  if (!owner || !Number.isInteger(record.people) || record.people < 1 || !Number.isFinite(record.duration) || record.duration <= 0 || record.duration > 24) throw new Error('请核对负责人、人数和时长（不超过24小时）。');
  const areaId = await ensureCloudArea(point);
  const rows = await cloudRequest('/rest/v1/activity_schedules', {
    method:'POST', headers:{Prefer:'return=representation'},
    body:JSON.stringify({area_id:areaId,activity_date:record.date,start_time:record.time,people:record.people,duration:record.duration,owner_name:owner,notes})
  });
  if (!rows?.length) throw new Error('排班未保存成功，请重试。');
  return rows[0].id;
}

// 只存当前标签页的会话令牌，不保存密码或业务数据。
const sessionKey = 'zymix-workbench-session-v1';
let savedSession = null;
let refreshInFlight = null;
let presenceInFlight = false;
let dataRefreshing = false;
try { savedSession = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { sessionStorage.removeItem(sessionKey); }

function rememberSession(session) {
  savedSession = {access_token: session.access_token, refresh_token: session.refresh_token,
    expires_at: session.expires_at || Math.floor(Date.now()/1000) + session.expires_in};
  cloudToken = session.access_token;
  sessionStorage.setItem(sessionKey, JSON.stringify(savedSession));
}
async function renewSession() {
  if (!savedSession) return;
  cloudToken = savedSession.access_token;
  if (savedSession.expires_at > Date.now()/1000 + 60) return;
  if (!refreshInFlight) refreshInFlight = (async () => {
    const session = await cloudRequest('/auth/v1/token?grant_type=refresh_token', {
      method:'POST', body:JSON.stringify({refresh_token:savedSession.refresh_token})
    });
    rememberSession(session);
  })().finally(() => { refreshInFlight = null; });
  await refreshInFlight;
}
function enterTeamMode() {
  $('#loginBtn').textContent = '退出登录';
  $('#cloudStatus').textContent = '团队数据 · 云端保存';
  $('#refreshDataBtn').hidden = false;
  $('#presencePanel').hidden = false;
  $('.bottom-note').textContent = '同一标签页刷新后保持登录；点击刷新数据读取团队更新。页面在前台时每分钟记录活跃时间，不记录输入内容。';
  $('.footnote').textContent = '这里只显示团队保存的地点和活动记录。';
  $('#viewFilter').value = ''; $('#viewFilter option[value="demo"]').disabled = true;
  $('#statusFilter').value = ''; $('#search').value = '';
  selected = points[0]?.id;
  renderAll();
  updatePresence();
}
async function signOutWorkbench() {
  $('#loginBtn').disabled = true;
  try { await cloudRequest('/auth/v1/logout?scope=local', {method:'POST'}); } catch { /* 本机仍会清除会话。 */ }
  finally {
    savedSession = null; cloudUser = null; cloudToken = null;
    sessionStorage.removeItem(sessionKey);
    window.location.reload();
  }
}
async function restoreWorkbench() {
  if (!savedSession) return;
  $('#loginBtn').disabled = true;
  $('#cloudStatus').textContent = '正在恢复登录…';
  try {
    await renewSession();
    const user = await cloudRequest('/auth/v1/user');
    const members = await cloudRequest('/rest/v1/team_members?select=user_id');
    if (!members.some(member => member.user_id === user.id)) throw new Error('账号没有团队权限');
    await loadCloudData();
    cloudUser = user;
    enterTeamMode();
  } catch (failure) {
    cloudToken = null; cloudUser = null;
    $('#cloudStatus').textContent = '恢复登录失败，请重新登录';
    toast(failure.message);
  } finally { $('#loginBtn').disabled = false; }
}
$('#refreshDataBtn').onclick = async () => {
  if (!cloudUser || dataRefreshing) return;
  if ($('#modal').open || pendingPointWrites.size) { toast('请先保存或关闭当前表单，再刷新数据'); return; }
  dataRefreshing = true;
  $('#refreshDataBtn').disabled = true;
  const areaId = points.find(point => point.id === selected)?.cloudId;
  // 读取期间禁用编辑入口，避免返回的数据覆盖正在填写的表单。
  const controls = [...document.querySelectorAll('#detail button, #detail select, #addBtn, #loginBtn')];
  const previous = controls.map(control => control.disabled);
  controls.forEach(control => control.disabled = true);
  try {
    await loadCloudData();
    selected = points.find(point => point.cloudId === areaId)?.id ?? points[0]?.id;
    $('#syncTime').textContent = '数据更新于 ' + new Date().toLocaleTimeString('zh-CN');
    toast('已读取团队最新数据');
  } catch (failure) { toast(failure.message); }
  finally {
    dataRefreshing = false; $('#refreshDataBtn').disabled = false;
    controls.forEach((control,index) => control.disabled = previous[index]);
    renderAll();
  }
};
async function updatePresence() {
  if (!cloudUser || document.hidden || presenceInFlight) return;
  presenceInFlight = true;
  try {
    await cloudRequest('/rest/v1/rpc/workbench_heartbeat', {method:'POST',body:'{}'});
    const members = await cloudRequest('/rest/v1/rpc/workbench_presence', {method:'POST',body:'{}'});
    $('#presenceList').innerHTML = members.map(member => {
      const recent = member.last_seen && Date.parse(member.server_now)-Date.parse(member.last_seen) < 120000;
      const text = !member.last_seen ? '尚无活跃记录' : (recent ? '近2分钟打开过工作台' : '最近活跃：' + new Date(member.last_seen).toLocaleString('zh-CN'));
      return `<div>${esc(member.display_name)}${member.user_id === cloudUser.id ? '（你）' : ''}：${esc(text)}</div>`;
    }).join('');
    $('#presenceChecked').textContent = '状态检查于 ' + new Date().toLocaleTimeString('zh-CN') + '；不代表正在填写，离开后最多约2分钟才过期。';
  } catch {
    $('#presenceList').textContent = '暂时无法读取活跃状态';
    $('#presenceChecked').textContent = '请确认已运行 presence-update.sql；不会影响活动数据保存。';
  } finally { presenceInFlight = false; }
}
setInterval(updatePresence, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updatePresence(); });
restoreWorkbench();
