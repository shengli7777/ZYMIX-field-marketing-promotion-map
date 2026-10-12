'use strict';

const screeningCache = new Map();
let screeningRequestRunning = false;
const screeningRadius = 600;
function nearbyQuery(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) throw new Error('请先通过地点搜索确认地图位置。');
  // 先用小范围矩形筛选，收到数据后再按600米直线距离过滤。
  const latitudeDelta = screeningRadius / 110000;
  const longitudeDelta = screeningRadius / (110000 * Math.max(0.01, Math.cos(lat * Math.PI / 180)));
  const area = `(${lat-latitudeDelta},${lng-longitudeDelta},${lat+latitudeDelta},${lng+longitudeDelta})`;
  return `[out:json][timeout:15][maxsize:33554432];(
    nwr${area}[amenity~"^(university|college|cafe|restaurant|cinema|theatre|arts_centre|bus_station)$"];
    nwr${area}[shop~"^(mall|department_store)$"];
    nwr${area}[leisure~"^(park|sports_centre|fitness_centre)$"];
    nwr${area}[railway=station];
    nwr${area}[place=square];
  );out body center;`;

}
function metresBetween(a,b) {
  const rad = x=>x*Math.PI/180;
  const h=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
function classifyFeature(tags) {
  if (['university','college'].includes(tags.amenity)) return 'education';
  if (tags.railway==='station'||tags.amenity==='bus_station') return 'transport';
  if (tags.leisure==='park'||tags.place==='square') return 'space';
  if (['mall','department_store'].includes(tags.shop)) return 'shopping';
  if (['cinema','theatre','arts_centre'].includes(tags.amenity)||['sports_centre','fitness_centre'].includes(tags.leisure)) return 'leisure';
  if (['cafe','restaurant'].includes(tags.amenity)) return 'food';
  return null;
}
function prepareEvidence(payload,point) {
  if (!Array.isArray(payload.elements)||payload.remark) throw new Error('查询返回的数据不完整，请稍后重试。');
  const entries=[];
  for (const item of payload.elements) {
    const tags=item.tags||{},group=classifyFeature(tags);
    const lat=item.lat??item.center?.lat,lng=item.lon??item.center?.lon;
    if (!group||!Number.isFinite(lat)||!Number.isFinite(lng)||!['node','way','relation'].includes(item.type)||!Number.isInteger(item.id)) continue;
    const distance=metresBetween(point,{lat,lng});
    if(distance>screeningRadius) continue;
    const name=tags.name||tags['name:en']||'未标名称';
    const duplicate=entries.some(entry=>entry.group===group&&name!=='未标名称'&&entry.name.toLowerCase()===name.toLowerCase()&&metresBetween(entry,{lat,lng})<80);
    if(!duplicate) entries.push({name,group,distance,lat,lng,url:`https://www.openstreetmap.org/${item.type}/${item.id}`});
  }
  return entries.sort((a,b)=>a.distance-b.distance);
}
function assessEvidence(entries) {
  const groups=Object.fromEntries(['education','transport','space','shopping','leisure','food'].map(group=>[group,entries.filter(entry=>entry.group===group)]));
  const activityTypes=['education','shopping','leisure','food'].filter(group=>groups[group].length>0).length;
  const transport=groups.transport.length>0,space=groups.space.length>0;
  const promising=activityTypes>=2&&transport&&space;
  return {groups,activityTypes,
    verdict:promising?'值得安排现场踏勘':entries.length?'先核实现场条件':'公开资料不足，暂不能判断',
    reason:promising?'周边有至少两类学习、消费或休闲设施，并查到交通站点和开放空间，具备进一步考察的条件。':'设施记录只能提供环境线索，尚不足以直接决定是否安排推广。',
    match:activityTypes>=2?3:null,access:transport?3:null,
    stop:null,weather:null};
}
async function getScreening(point) {
  const query=nearbyQuery(point.lat,point.lng);
  const key=`${point.lat},${point.lng}`;
  const cached=screeningCache.get(key);
  if(cached&&Date.now()-cached.fetched<3600000) return cached;
  if(screeningRequestRunning) throw new Error('已有地点查询正在进行，请稍后再试。');
  screeningRequestRunning=true;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
  try {
    const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:query}),signal:controller.signal});
    if(!response.ok) throw new Error('公共查询服务繁忙，请稍后重试（'+response.status+'）。');
    const payload=await response.json();
    const entries=prepareEvidence(payload,point);
    const result={entries,fetched:Date.now(),sourceDate:payload.osm3s?.timestamp_osm_base||null,...assessEvidence(entries)};
    screeningCache.set(key,result); return result;
  } finally { clearTimeout(timer);screeningRequestRunning=false; }
}
async function openScreening(point) {
  if (!point) { toast('请先选择一个地点'); return; }
  if(typeof dataRefreshing!=='undefined'&&dataRefreshing) {toast('请等数据刷新完成');return;}
  openModal('新点位公开资料初筛',`<h3>${esc(point.name)}</h3><div id="screeningBody">正在查询周边600米的公开地图设施，通常需要几秒至半分钟…</div>`);
  const box=$('#screeningBody');
  try {
    const report=await getScreening(point);
    if(!box.isConnected) return;
    const labels={education:'大学／学院',shopping:'购物设施',leisure:'娱乐／运动',food:'餐饮／咖啡',transport:'交通站点',space:'公园／广场'};
    box.innerHTML=`<div class="next"><strong>${report.verdict}</strong><p>${report.reason}</p></div>
      <p class="note">规则初筛 v1 · 面向广泛年轻人 · 不要求历史活动记录。结论只建议下一步踏勘，不是已经确认可以推广。</p>
      <div class="metric-grid">${Object.entries(labels).map(([group,label])=>`<div class="metric"><span>${label}</span><strong>${report.groups[group].length} 条</strong></div>`).join('')}</div>
      <p class="note">以上是OSM地图记录数，不是人流量或精确门店数量。同名同类80米内记录已合并；不同名称的重复设施仍可能存在。距离按标注点／面中心计算，为直线距离，不是步行距离。</p>
      <h3>建议评分</h3><p>人群匹配：${report.match===null?'待观察':'建议3分：周边至少两类学习、消费或休闲设施；不代表已知年轻人比例'}<br>交通便利：${report.access===null?'待确认':'建议3分：600米内查到交通站点，尚未核实步行路线'}<br>愿意停留交流：待观察<br>天气适应性：待确认</p>
      <h3>本次没有的数据</h3><p>区域真实人流、年龄构成、停留比例、场地推广许可。没有查到设施也不代表现场没有；数据不足不会按零分处理。</p>
      <h3>现场优先确认</h3><p>是否有适合交流又不挡路的位置、目标人群实际经过情况、场地归属及推广要求、有无遮挡。</p>
      <details><summary>查看设施和来源（${report.entries.length}条）</summary>${report.entries.map(entry=>`<p><a href="${entry.url}" target="_blank" rel="noopener">${esc(entry.name)}</a> · ${labels[entry.group]} · 约${Math.round(entry.distance)}米</p>`).join('')||'<p>本次没有匹配记录。</p>'}</details>
      <p class="note">查询时间：${esc(new Date(report.fetched).toLocaleString('zh-CN'))}<br>OSM数据库时间：${esc(report.sourceDate||'未提供')}（不是每个设施的更新日期）<br>来源：© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> / Overpass。公共接口可能繁忙，本版供少量候选点试用。</p>
      <p class="note">规则：至少两类学习／消费／休闲设施，同时有交通站点及公园／广场，才建议现场踏勘。阈值是试用规则，尚未经活动效果验证。不会根据历史反馈缺失扣分。</p>
      <button id="adoptScreening" class="primary">选择要采用的建议分数</button>`;
    $('#adoptScreening').onclick=()=>{
      $('#modal').close();
      showEvidenceScores(point,report);
    };
  } catch(error) { if(box.isConnected) { box.innerHTML=`<p class="error">${esc(error.name==='AbortError'?'查询超时，请稍后重新打开。':error.message||'查询失败，请检查网络。')}</p><p>此次未生成评分，不会修改已有数据。</p><button id="retryScreening">重新查询</button>`; $('#retryScreening').onclick=()=>openScreening(point); } }
}
function showEvidenceScores(point,report) {
  const eligible=['match','access'].filter(field=>report[field]!==null);
  openModal('确认建议评分',`<form id="evidenceScoreForm">${eligible.map(field=>`<label><input type="checkbox" name="${field}" ${point[field]==null?'checked':''}>${field==='match'?'目标用户匹配':'交通与执行便利'}：${report[field]}分${point[field]!=null?`（现有${point[field]}分，勾选将覆盖）`:''}</label>`).join('')||'<p>目前资料不足，没有可保存的建议分数。</p>'}<p>其余项目保持原值。完整依据请在初筛报告中查看。</p><p id="evidenceError" class="error"></p><button class="primary submit" ${eligible.length?'':'disabled'}>确认保存</button></form>`);
  $('#evidenceScoreForm').onsubmit=async event=>{
    event.preventDefault();const form=event.target,button=form.querySelector('button');
    const fields=eligible.filter(field=>form.elements[field].checked);
    if(!fields.length){$('#evidenceError').textContent='请勾选至少一项';return;}
    if(pendingPointWrites.has(point.id)){$('#evidenceError').textContent='点位正在保存，请稍后重试';return;}
    button.disabled=true;pendingPointWrites.add(point.id);
    try{
      const id=await ensureCloudArea(point);
      const rows=await cloudRequest('/rest/v1/areas?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(Object.fromEntries(fields.map(field=>['rating_'+field,report[field]])))});
      if(!rows?.length)throw Error('未保存成功');
      fields.forEach(field=>point[field]=report[field]);
      point.hasRatings=['match','stop','access','weather'].every(field=>Number.isInteger(point[field]));
      $('#modal').close();renderAll();toast('已保存勾选的建议评分');
    }catch(error){$('#evidenceError').textContent=error.message;}
    finally{button.disabled=false;pendingPointWrites.delete(point.id);}
  };
}
const detailBeforeScreening=renderDetail;
renderDetail=function(){
  detailBeforeScreening();
  if(!cloudUser)return;
  const point=points.find(item=>item.id===selected);if(!point)return;
  const button=document.createElement('button');button.className='primary';button.textContent='查询周边资料并初筛';button.style.cssText='width:100%;margin:10px 0';
  button.onclick=()=>openScreening(point);$('#detail h2').after(button);
};
