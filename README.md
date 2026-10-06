# 地推点位工作台

这个项目是我结合地推工作的经历做的一个小工具。我想把找地方、安排活动和看反馈放在一张地图上，这样比较不同地点时会直观一些。

[打开网页](https://shengli7777.github.io/ZYMIX-field-marketing-promotion-map/)

## 页面里有什么

目前放了两类内容，可以一起看，也可以用“查看内容”筛选。

一类是四个候选区域：UCL Gordon Square、Whitechapel Station、Panda’s Kitchen Angel，以及 Shepherd’s Bush / Westfield。点击后可以看到附近车站的客流数字，作为选址时的参考。

另一类是六个活动演示点，包含已排班、已反馈、待确认和暂停等状态。这里的评分和活动记录是示例，主要用来展示从选点到复盘的过程，没有使用公司的内部业绩数据。

## 怎么用

先在地图或左侧列表里选一个地点，查看右侧的信息。确认场地可以开展活动后，可以安排时间、人数和负责人。活动结束后，再填实际人时、扫码量、注册量和成本。

页面会根据反馈计算扫码转注册比例、每人时注册量和每注册成本。表现不合适的点位可以暂停，后面也能重新启用。暂时只保存当前页面里的修改，刷新后会恢复初始内容。

## 客流数据

| 候选区域 | 参考车站 | 2025 年日均进出闸次数 |
|---|---|---:|
| UCL Gordon Square | Euston Square | 31,291 |
| Whitechapel Station | Whitechapel | 51,246 |
| Panda’s Kitchen Angel | Angel | 33,156 |
| Shepherd’s Bush / Westfield | Shepherd’s Bush 地铁站 | 36,514 |

数字取自 [Marius Comper 整理的伦敦车站数据](https://mariuscomper.uk/london-station-diary/)，原始来源是 [TfL 开放数据](https://crowding.data.tfl.gov.uk/)。我在这版中使用了公开汇总表，没有重新计算原始逐日数据。统计单位是车站进出闸次数，适合用来了解附近的交通客流；区域内有多少人愿意停下来交流，还需要结合实际活动反馈。

## 本地运行

用 VS Code 打开文件夹，再通过 Live Preview 打开 `index.html` 就可以。不需要安装 npm，也没有 API 密钥。

如果电脑装了 Python，也可以在文件夹里运行：

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 文件说明

- `index.html`：页面结构。
- `style.css`：页面样式和手机适配。
- `app.js`：点位数据、地图交互、排班和反馈计算。

项目使用 HTML、CSS 和 JavaScript。底图来自 [OpenStreetMap](https://www.openstreetmap.org/copyright)。下一步想补充不同时段的客流，以及按场次保存的真实反馈，让选址比较更有依据。
