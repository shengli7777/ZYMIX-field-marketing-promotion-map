const venueTypes = ['待确认', '校园周边', '交通站点周边', '商圈／商业街', '餐饮店周边', '公园／广场', '学生公寓周边', '其他'];
const environmentTypes = ['待确认', '室内', '室外', '室内外混合'];
function venueOptions(values, current = '待确认') {
  const options = values.includes(current) ? values : [current, ...values];
  return options.map(value => `<option ${value === current ? 'selected' : ''}>${esc(value)}</option>`).join('');
}

"use strict";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
// 未登录时提供模拟活动，登录后只读取团队保存的地点。
const points = [
  {
    id: 5,
    name: "演示点 A",
    type: "学生公寓附近",
    lat: 51.5265,
    lng: -0.131,
    indoor: "室内",
    permission: "已确认",
    match: 5,
    stop: 4,
    access: 4,
    weather: 5,
    paused: false,
    group: "demo",
    note: "活动演示点，用来试用选址和反馈。",
  },
  {
    id: 6,
    name: "演示点 B",
    type: "校园周边公共空间",
    lat: 51.521,
    lng: -0.14,
    indoor: "室外",
    permission: "已确认",
    match: 5,
    stop: 3,
    access: 4,
    weather: 2,
    paused: false,
    group: "demo",
    note: "活动演示点，用来试用选址和反馈。",
  },
  {
    id: 7,
    name: "演示点 C",
    type: "社区活动空间",
    lat: 51.513,
    lng: -0.125,
    indoor: "室内",
    permission: "待确认",
    match: 3,
    stop: 5,
    access: 4,
    weather: 5,
    paused: false,
    group: "demo",
    note: "活动演示点，用来试用选址和反馈。",
  },
  {
    id: 8,
    name: "演示点 D",
    type: "商业街附近",
    lat: 51.5145,
    lng: -0.145,
    indoor: "室外",
    permission: "已确认",
    match: 3,
    stop: 2,
    access: 5,
    weather: 2,
    paused: true,
    group: "demo",
    note: "活动演示点，用来试用选址和反馈。",
  },
  {
    id: 9,
    name: "演示点 E",
    type: "青年活动空间",
    lat: 51.534,
    lng: -0.119,
    indoor: "室内",
    permission: "已确认",
    match: 4,
    stop: 4,
    access: 3,
    weather: 5,
    paused: false,
    group: "demo",
    note: "活动演示点，用来试用选址和反馈。",
  },
  {
    id: 10,
    name: "演示点 F",
    type: "交通节点周边",
    lat: 51.529,
    lng: -0.108,
    indoor: "室外",
    permission: "不允许",
    match: 4,
    stop: 2,
    access: 5,
    weather: 2,
    paused: false,
    group: "demo",
    note: "活动演示点，用来试用选址和反馈。",
  },
];
const records = [
  {
    id: 1,
    pid: 5,
    date: "2026-10-02",
    time: "13:00",
    hours: 4,
    scans: 85,
    regs: 28,
    cost: 120,
    state: "已完成",
    note: "示例：现场交流顺畅",
  },
  {
    id: 2,
    pid: 5,
    date: "2026-10-03",
    time: "13:00",
    hours: 4,
    scans: 94,
    regs: 32,
    cost: 120,
    state: "已完成",
    note: "示例：第二次试推",
  },
  {
    id: 4,
    pid: 8,
    date: "2026-10-02",
    time: "14:00",
    hours: 4,
    scans: 40,
    regs: 5,
    cost: 120,
    state: "已完成",
    note: "示例：停留少，暂停复测",
  },
];
const classes = {
  候选: "candidate",
  可试推: "ready",
  已排班: "planned",
  已反馈: "done",
  暂停: "paused",
};
let cloudUser = null;
let cloudToken = null;
let selected = 5,
  addMode = false,
  center = {
    lat: 51.52,
    lng: -0.14,
  },
  zoom = 12,
  pan = null,
  toastTimer;
function score(point) {
  return Math.round(
    (point.match * 0.35 +
      point.stop * 0.35 +
      point.access * 0.15 +
      point.weather * 0.15) *
      20,
  );
}
function status(point) {
  if (point.paused || point.permission === "不允许") return "暂停";
  if (
    records.some(
      (record) => record.pid === point.id && record.state === "已完成",
    )
  )
    return "已反馈";
  return point.permission === "已确认" ? "可试推" : "候选";
}
function aggregate(point) {
  const completed = records.filter(record => record.pid === point.id && record.state === '已完成');
  const totals = completed.reduce((sum, record) => ({
    n: sum.n + 1, h: sum.h + record.hours, r: sum.r + record.regs,
    s: sum.s + (record.scans ?? 0), c: sum.c + (record.cost ?? 0)
  }), {n:0,h:0,r:0,s:0,c:0});
  const scansComplete = completed.every(record => Number.isFinite(record.scans));
  const costsComplete = completed.every(record => Number.isFinite(record.cost));
  return {...totals,
    rate: scansComplete && totals.s > 0 ? totals.r / totals.s : null,
    cac: costsComplete && totals.r > 0 ? totals.c / totals.r : null,
    rph: totals.h > 0 ? totals.r / totals.h : null,
    scansComplete, costsComplete
  };
}

function nextAction(point) {
  if (point.permission === "不允许") return "该点位不可开展，选择其他点位。";
  if (point.permission === "待确认")
    return "先确认开放时间、场地要求与是否可开展。";
  if (point.paused) return "先复核低效原因或现场限制，再决定是否重启。";
  let metrics = aggregate(point);
  if (!metrics.n) return "安排一次小规模试推，验证目标用户与停留情况。";
  if (metrics.n < 2) return "目前只有一次反馈，换时段复测后再判断。";
  return "已有多次反馈，可以与其他点位比较，并确定下一次安排。";
}
function filtered() {
  return points
    .filter(
      (point) =>
        (!$("#typeFilter").value || point.type === $("#typeFilter").value) &&
        (!$("#viewFilter").value || point.group === $("#viewFilter").value) &&
        (!$("#search").value ||
          (point.name + point.type + (point.city || "") + (point.address || "")).toLowerCase().includes($("#search").value.toLowerCase())) &&
        (!$("#statusFilter").value ||
          status(point) === $("#statusFilter").value) &&
        (!$("#indoorFilter").value ||
          point.indoor === $("#indoorFilter").value),
    )
    .sort((firstPoint, secondPoint) => firstPoint.id - secondPoint.id);
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function renderList() {
  let visiblePoints = filtered();
  $("#count").textContent = `${visiblePoints.length} 个点位`;
  $("#pointList").innerHTML = visiblePoints.length
    ? visiblePoints
        .map(
          (
            point,
          ) => `<button class="point-card ${point.id === selected ? "active" : ""}" data-id="${point.id}">
<div class="card-row">
<strong>${esc(point.name)}</strong>
<span class="badge ${classes[status(point)]}">${status(point)}</span>
</div>
<p>${esc(point.type)} · ${point.indoor}${point.group === "demo" ? " · 示例" : ""}</p>
<div class="card-row">
<span class="score">${point.traffic ? point.traffic.daily2025.toLocaleString("en-GB") + " 次/日" : ["match", "stop", "access", "weather"].every((key) => Number.isInteger(point[key])) ? "初筛 " + score(point) + " / 100" : "待观察"}</span>
<span class="note">${point.permission}</span>
</div>
</button>`,
        )
        .join("")
    : '<div class="empty">没有符合筛选条件的点位。</div>';
  $("#pointList")
    .querySelectorAll("button")
    .forEach(
      (button) =>
        (button.onclick = () => selectPoint(Number(button.dataset.id))),
    );
}
function selectPoint(id) {
  if (!points.some((point) => point.id === id)) throw Error("点位不存在");
  selected = id;
  let point = points.find((point) => point.id === id);
  if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) center = {lat: point.lat, lng: point.lng};
  renderAll();
}
function renderDetail() {
  let point = points.find((point) => point.id === selected);
  if (!point) {
    $("#detail").innerHTML = '<p class="empty">选择一个点位查看详情。</p>';
    return;
  }
  let metrics = aggregate(point),
    activityRecords = records.filter((record) => record.pid === point.id);
  $("#detail").innerHTML =
    `<span class="badge ${classes[status(point)]}">${status(point)}</span>
<h2>${esc(point.name)}</h2>
<div class="meta">${esc(point.type)} · ${point.indoor}<br>${Number.isFinite(point.lat) && Number.isFinite(point.lng) ? `区域中心示意坐标 ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : `地点待核对 · ${esc(point.city || "")} ${esc(point.address || "")}`}</div>${trafficPanel(point)}<h3>开展条件</h3>
<label>场地类型<select id="venueType">${venueOptions(venueTypes, point.type)}</select></label>
<label>环境类型<select id="environmentType">${venueOptions(environmentTypes, point.indoor)}</select></label>
<label>场地确认<select id="permission">
<option>待确认</option>
<option>已确认</option>
<option>不允许</option>
</select>
</label>
<p class="note">${esc(point.note)}</p>${ratingPanel(point)}<h3>活动结果 <span class="note">${metrics.n} 次已完成</span>
</h3>
<div class="metric-grid">
<div class="metric">
<span>注册量</span>
<strong>${metrics.n ? metrics.r : "—"}</strong>
</div>
<div class="metric">
<span>扫码到注册</span>
<strong>${metrics.rate === null ? "—" : (metrics.rate * 100).toFixed(1) + "%"}</strong>
</div>
<div class="metric">
<span>每人时注册</span>
<strong>${metrics.rph === null ? "—" : metrics.rph.toFixed(1)}</strong>
</div>
<div class="metric">
<span>每注册成本</span>
<strong>${metrics.cac === null ? "—" : "£" + metrics.cac.toFixed(2)}</strong>
</div>
</div>
<p class="note">按该区域全部已完成活动汇总。转化率＝注册总量÷扫码总量；每注册成本＝总成本÷注册总量。缺少扫码数或费用时，对应指标暂不计算。</p>
<p class="note">${metrics.n ? `合计 ${metrics.h} 人时 · ${metrics.scansComplete ? metrics.s + " 扫码" : "扫码待补齐"} · ${metrics.costsComplete ? "£" + metrics.c.toFixed(2) : "费用待补齐"}` : ""}</p>
<div class="next">
<strong>下一步</strong>
<p class="note">${nextAction(point)}</p>
<div class="actions">
<button id="feedbackBtn">记录反馈</button>
</div>
<button id="pauseBtn" class="quiet" style="margin-top:10px;width:100%">${point.paused ? "重启点位" : "暂停点位"}</button>
</div>
<h3>活动记录</h3>${
      activityRecords.length
        ? activityRecords.map(activityCard).join("")
        : '<p class="note">尚无活动记录。</p>'
    }`;
  $("#detail").querySelectorAll("[data-record-id]").forEach(button => {
    button.onclick = () => openFeedback(point, Number(button.dataset.recordId));
  });
  $("#venueType").onchange = event => updatePointField(point, "type", event.target.value);
  $("#environmentType").onchange = event => updatePointField(point, "indoor", event.target.value);
  $("#permission").value = point.permission;
  $("#permission").onchange = event => updatePointField(point, "permission", event.target.value);
  $("#detail")
    .querySelectorAll("[data-rating]")
    .forEach((select) => {
      select.onchange = () => updatePointField(point, select.dataset.rating, select.value ? Number(select.value) : null);
    });
  $("#feedbackBtn").onclick = () => openFeedback(point);
  $("#pauseBtn").onclick = () => updatePointField(point, "paused", !point.paused);
}
function trafficPanel(point) {
  const data = point.traffic;
  if (!data) return "";
  return `<section class="traffic">
    <span class="traffic-label">2025 年 · 车站日均进出闸次数</span>
    <div class="traffic-number">${data.daily2025.toLocaleString("en-GB")}<small> 次 / 日</small>
</div>
    <strong>${esc(data.station)}</strong>
    <details>
      <summary>数据来源</summary>
      <p class="note">TfL 数据的第三方汇总，统计单位为进出闸次数。此处用作附近区域的客流参考。</p>
      <a href="${data.source}" target="_blank" rel="noopener noreferrer">查看汇总表</a>
    </details>
  </section>`;
}
function ratingPanel(point) {
  const hasRatings = ["match", "stop", "access", "weather"].every(
    (key) => Number.isInteger(point[key]) && point[key] >= 1 && point[key] <= 5,
  );
  const ratings = [
    ["目标用户匹配", "match", "35%"],
    ["愿意停留交流", "stop", "35%"],
    ["交通与执行便利", "access", "15%"],
    ["天气适应性", "weather", "15%"],
  ];
  return `<h3>初筛评分 <span class="score">${hasRatings ? score(point) + " 分" : "待评分"}</span></h3>
    ${ratings
      .map(
        ([label, key, weight]) => `
      <label class="rating rating-input">
        <span>${label} <small>${weight}</small></span>
        <select data-rating="${key}" aria-label="${label}">
          <option value="">待评分</option>
          ${[1, 2, 3, 4, 5].map((value) => `<option value="${value}" ${point[key] === value ? "selected" : ""}>${value} / 5</option>`).join("")}
        </select>
      </label>`,
      )
      .join("")}
    <p class="note">${point.group === "demo" ? "评分和活动记录为演示数据。" : "按现场观察选择 1–5 分，填完四项后计算总分。"}</p>`;
}
function world(lat, lng, zoomLevel) {
  const worldSize = 256 * Math.pow(2, zoomLevel),
    latitudeSine = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * worldSize,
    y:
      (0.5 -
        Math.log((1 + latitudeSine) / (1 - latitudeSine)) / (4 * Math.PI)) *
      worldSize,
  };
}
function geo(x, y, zoomLevel) {
  const worldSize = 256 * Math.pow(2, zoomLevel);
  return {
    lng: (x / worldSize) * 360 - 180,
    lat:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / worldSize))) * 180) /
      Math.PI,
  };
}
function renderMap() {
  let map = $("#map"),
    width = map.clientWidth,
    height = map.clientHeight,
    centerPixels = world(center.lat, center.lng, zoom),
    left = centerPixels.x - width / 2,
    top = centerPixels.y - height / 2,
    tiles = $("#tiles"),
    wanted = new Set();
  let tileCount = Math.pow(2, zoom);
  for (
    let y = Math.floor(top / 256);
    y <= Math.floor((top + height) / 256);
    y++
  )
    for (
      let x = Math.floor(left / 256);
      x <= Math.floor((left + width) / 256);
      x++
    ) {
      if (y < 0 || y >= tileCount) continue;
      const tileX = ((x % tileCount) + tileCount) % tileCount,
        key = `${zoom}-${tileX}-${y}`;
      wanted.add(key);
      let tileImage = tiles.querySelector(`[data-key="${key}"]`);
      if (!tileImage) {
        tileImage = document.createElement("img");
        tileImage.dataset.key = key;
        tileImage.alt = "";
        tileImage.draggable = false;
        tileImage.referrerPolicy = "strict-origin-when-cross-origin";
        tileImage.src = `https://tile.openstreetmap.org/${zoom}/${tileX}/${y}.png`;
        tileImage.onerror = () => {
          if (!addMode) {
            $("#mapMessage").hidden = false;
            $("#mapMessage").textContent =
              "底图暂时无法加载，仍可点击点位查看和操作。";
          }
        };
        tiles.append(tileImage);
      }
      tileImage.style.left = x * 256 - left + "px";
      tileImage.style.top = y * 256 - top + "px";
    }
  for (const tileImage of [...tiles.children])
    if (!wanted.has(tileImage.dataset.key)) tileImage.remove();
  $("#markers").innerHTML = filtered()
    .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .map((point) => {
      let pointPixels = world(point.lat, point.lng, zoom);
      return `<button class="marker ${classes[status(point)]} ${point.id === selected ? "selected" : ""}" style="left:${pointPixels.x - left}px;top:${pointPixels.y - top}px" data-id="${point.id}" aria-label="${esc(point.name)}，${status(point)}">${point.id}</button>`;
    })
    .join("");
  $("#markers")
    .querySelectorAll("button")
    .forEach((button) => {
      button.onpointerdown = (event) => event.stopPropagation();
      button.onclick = (event) => {
        event.stopPropagation();
        selectPoint(Number(button.dataset.id));
      };
    });
}
function renderAll() {
  document.querySelector(".map-bar strong").textContent = points.find(point => point.id === selected)?.city || "伦敦";
  renderList();
  renderDetail();
  renderMap();

}
function openModal(title, html) {
  if (typeof dataRefreshing !== "undefined" && dataRefreshing) { toast("正在刷新数据，请稍后打开表单"); return; }
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = html;
  $("#modal").showModal();
}
function field(label, name, type = "number", value = "", extra = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${value}" required ${extra}>
</label>`;
}
// 使用浏览器本地日期，避免 UTC 日期在午夜前后相差一天。
function todayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
function activityCard(record) {
  const timeRange = record.endTime ? `${record.time}–${record.endTime}` : record.time;
  if (record.state !== '已完成') return `<div class="record"><strong>${esc(record.date)} ${esc(timeRange)} · ${esc(record.state)}</strong><br>${record.people} 人 · ${record.duration} 小时<br>${esc(record.note || '')}</div>`;
  return `<div class="record">
    <strong>${esc(record.date)} ${esc(timeRange)} · 已完成</strong>
    <div>推荐码：${esc(record.referralCode || '未填写')}</div>
    <div>${record.hours} 人时 · ${record.scans === null || record.scans === undefined ? '扫码待补' : record.scans + ' 扫码'} · ${record.regs} 注册 · ${record.cost === null || record.cost === undefined ? '费用待补' : '£' + record.cost.toFixed(2)}</div>
    ${record.note ? `<div>${esc(record.note)}</div>` : ''}
    <button type="button" class="quiet edit-record" data-record-id="${record.id}">编辑记录</button>
  </div>`;
}

function openFeedback(point, recordId = null) {
  const existing = recordId === null ? null : records.find(record => record.id === recordId && record.pid === point.id && record.state === '已完成');
  if (recordId !== null && !existing) { toast('找不到这条记录'); return; }
  const input = (label, name, type, value, required = true, extra = '') => `<label>${label}<input name="${name}" type="${type}" value="${esc(value ?? '')}" ${required ? 'required' : ''} ${extra}></label>`;
  openModal(existing ? '编辑活动反馈' : '记录活动反馈', `
    <p class="note">区域：${esc(point.name)}。一组一场填一条；推荐码用来区分同一区域的不同小组。</p>
    <form id="feedbackForm"><div class="form-grid">
      ${input('日期','date','date',existing?.date || todayDate())}
      ${input('推荐码','referralCode','text',existing?.referralCode || '',true,'maxlength="60" placeholder="例如：1号、004"')}
      ${input('开始时间','time','time',existing?.time || '13:00')}
      ${input('结束时间','endTime','time',existing?.endTime || '')}
      ${input('实际总人时','hours','number',existing?.hours,true,'min="0.1" step="0.1"')}
      ${input('总成本 £（可后补）','cost','number',existing?.cost,false,'min="0" step="0.01"')}
      ${input('扫码次数（可后补）','scans','number',existing?.scans,false,'min="0" step="1"')}
      ${input('新增注册人数','regs','number',existing?.regs,true,'min="0" step="1"')}
      <label class="full">备注（选填）<textarea name="note" rows="2" maxlength="1000" placeholder="例如：组长5.5小时，组员1小时">${esc(existing?.note || '')}</textarea></label>
    </div>
    <p class="note">2人各做2小时＝4人时。未知扫码数或费用留空，确实没有才填0；本表按同日活动记录。</p>
    <p id="formError" class="error" role="alert"></p>
    <button class="primary submit">${existing ? '保存修改' : '保存反馈'}</button></form>`);
  const form = $('#feedbackForm');
  form.onsubmit = async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const optionalNumber = name => data.get(name).trim() === '' ? null : Number(data.get(name));
    const hours = Number(data.get('hours')), regs = Number(data.get('regs'));
    const scans = optionalNumber('scans'), cost = optionalNumber('cost');
    const referralCode = data.get('referralCode').trim();
    const error = message => { $('#formError').textContent = message; };
    if (!referralCode) return error('请填写推荐码。');
    if (data.get('endTime') <= data.get('time')) return error('结束时间应晚于开始时间；跨日活动请拆分记录。');
    if (!Number.isFinite(hours) || hours <= 0 || !Number.isInteger(regs) || regs < 0 || (scans !== null && (!Number.isInteger(scans) || scans < 0)) || (cost !== null && (!Number.isFinite(cost) || cost < 0))) return error('请核对人时、人数和费用。');
    if (scans !== null && regs > scans) return error('注册人数超过扫码次数，请核对同一场活动的数据；扫码数未知可留空。');
    const duplicate = records.some(record => record.id !== existing?.id && record.pid === point.id && record.state === '已完成' && record.date === data.get('date') && record.time === data.get('time') && record.endTime === data.get('endTime') && record.referralCode === referralCode);
    if (duplicate) return error('相同日期、时段和推荐码已有记录，请编辑原记录。');
    const plan = null;
    const updated = {pid:point.id,date:data.get('date'),time:data.get('time'),endTime:data.get('endTime'),referralCode,hours,scans,regs,cost,note:data.get('note').trim(),state:'已完成'};
    if (cloudUser) {
      const button = form.querySelector('button.submit');
      button.disabled = true;
      try {
        updated.cloudId = await saveCloudFeedback(point, updated, existing?.cloudId, plan?.scheduleId);
      } catch (failure) {
        error(failure.message);
        return;
      } finally {
        button.disabled = false;
      }
    }
    if (existing || plan) Object.assign(existing || plan, updated);
    else records.push({...updated,id:Math.max(0,...records.map(record => record.id))+1});
    $('#modal').close(); renderAll(); toast(cloudUser ? '反馈已保存到云端' : '演示反馈仅保留在当前页面');
  };
}

function openAdd(lat, lng) {
  addMode = false;
  $("#mapMessage").hidden = true;
  openModal(
    "新增候选点位",
    `<p class="note">坐标 ${lat.toFixed(4)}, ${lng.toFixed(4)}。评分 1 为低、3 为中等、5 为高。</p>
<form id="addForm">
<div class="form-grid">
<label class="full">点位名称<input name="name" required maxlength="50">
</label>
<label class="full">类型<input name="type" required placeholder="例如学生公寓、社区空间">
</label>
<label>室内或室外<select name="indoor">
<option>室内</option>
<option>室外</option>
</select>
</label>
<label>场地确认<select name="permission">
<option>待确认</option>
<option>已确认</option>
<option>不允许</option>
</select>
</label>${field("目标用户匹配", "match", "number", 3, 'min="1" max="5" step="1"')}${field("愿意停留交流", "stop", "number", 3, 'min="1" max="5" step="1"')}${field("交通与执行便利", "access", "number", 3, 'min="1" max="5" step="1"')}${field("天气适应性", "weather", "number", 3, 'min="1" max="5" step="1"')}<label class="full">观察备注<input name="note" required>
</label>
</div>
<button class="primary submit">加入候选点位</button>
</form>`,
  );
  $("#addForm").onsubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    let point = {
      id: Math.max(...points.map((point) => point.id)) + 1,
      lat,
      lng,
      paused: false,
      group: "candidate",
      hasRatings: true,
    };
    for (const fieldName of ["name", "type", "indoor", "permission", "note"])
      point[fieldName] = formData.get(fieldName);
    for (const fieldName of ["match", "stop", "access", "weather"])
      point[fieldName] = Number(formData.get(fieldName));
    points.push(point);
    $("#modal").close();
    $("#viewFilter").value = "";
    $("#typeFilter").value = "";
    $("#search").value = "";
    $("#statusFilter").value = "";
    $("#indoorFilter").value = "";
    selectPoint(point.id);
    toast("候选点位已新增");
  };
}
$("#viewFilter").onchange = () => {
  $("#statusFilter").value = "";
  renderList();
  renderMap();
};
$("#search").oninput = () => {
  renderList();
  renderMap();
};
$("#typeFilter").onchange = $("#statusFilter").onchange = $("#indoorFilter").onchange = () => {
  renderList();
  renderMap();
};
$("#closeModal").onclick = () => $("#modal").close();
$("#modal").onclick = (event) => {
  if (event.target === $("#modal")) $("#modal").close();
};
$("#zoomIn").onclick = () => {
  zoom = Math.min(17, zoom + 1);
  renderMap();
};
$("#zoomOut").onclick = () => {
  zoom = Math.max(11, zoom - 1);
  renderMap();
};
$("#resetMap").onclick = () => {
  zoom = 12;
  center = {
    lat: 51.52,
    lng: -0.14,
  };
  renderMap();
};
$("#addBtn").onclick = () => {
  addMode = !addMode;
  $("#mapMessage").hidden = !addMode;
  $("#mapMessage").textContent =
    "点击地图放置新点位，再填写信息。再点“新增点位”可取消。";
  toast(addMode ? "请点击地图选择位置" : "已取消新增");
};
$("#helpBtn").onclick = () =>
  openModal(
    "地推点位工作流",
    `<div class="step">
<strong>1 收集候选点位</strong>
<p>记录位置、目标用户、停留情况、室内外与场地要求。把来源和现场观察写入备注。</p>
</div>
<div class="step">
<strong>2 确认可开展并初筛</strong>
<p>场地待确认时只保留为候选。初筛分用于确定优先试推次序，评分高不代表实际效果一定好。</p>
</div>
<div class="step">
<strong>3 安排小规模试推</strong>
<p>确定负责人、日期、人员、时长及备选。用不同时间段验证点位，而不是一次就定好坏。</p>
</div>
<div class="step">
<strong>4 收集实际活动反馈</strong>
<p>同一活动记录人时、扫码、去重注册、完整成本和现场异常。缺失数据先补齐再比较。</p>
</div>
<div class="step">
<strong>5 复盘后进入下一轮</strong>
<p>结合多次反馈比较转化、每人时注册和成本，决定继续、换时段、复测或暂停。暂停与重启由负责人根据实际原因决定。</p>
</div>`,
  );
$("#map").onpointerdown = (event) => {
  if (event.target.closest("button,a")) return;
  pan = {
    x: event.clientX,
    y: event.clientY,
    base: world(center.lat, center.lng, zoom),
    moved: false,
  };
  $("#map").setPointerCapture(event.pointerId);
};
$("#map").onpointermove = (event) => {
  if (!pan) return;
  let dx = event.clientX - pan.x,
    dy = event.clientY - pan.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) pan.moved = true;
  center = geo(pan.base.x - dx, pan.base.y - dy, zoom);
  renderMap();
};
$("#map").onpointerup = (event) => {
  if (pan && !pan.moved && addMode) {
    let rect = $("#map").getBoundingClientRect(),
      c = world(center.lat, center.lng, zoom),
      g = geo(
        c.x + event.clientX - rect.left - rect.width / 2,
        c.y + event.clientY - rect.top - rect.height / 2,
        zoom,
      );
    openAdd(g.lat, g.lng);
  }
  pan = null;
};
$("#map").onpointercancel = () => (pan = null);
$("#map").onkeydown = (event) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
    return;
  event.preventDefault();
  let c = world(center.lat, center.lng, zoom);
  c.x += event.key === "ArrowRight" ? 80 : event.key === "ArrowLeft" ? -80 : 0;
  c.y += event.key === "ArrowDown" ? 80 : event.key === "ArrowUp" ? -80 : 0;
  center = geo(c.x, c.y, zoom);
  renderMap();
};
new ResizeObserver(renderMap).observe($("#map"));
renderAll();


// 成功写入后再更新页面；失败时恢复原值。
const pendingPointWrites = new Set();
async function updatePointField(point, field, value) {
  if (pendingPointWrites.has(point.id)) { renderAll(); toast('这个点位正在保存，请稍后再修改'); return; }
  pendingPointWrites.add(point.id);
  try {
    if (cloudUser) await saveCloudPointField(point, field, value);
    point[field] = value;
    point.hasRatings = ['match','stop','access','weather'].every(key => Number.isInteger(point[key]) && point[key] >= 1 && point[key] <= 5);
    toast(cloudUser ? '已保存到云端' : '演示修改仅本次有效');
  } catch (failure) { toast(failure.message); }
  finally { pendingPointWrites.delete(point.id); renderAll(); }
}
