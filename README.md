# ZYMIX 地推点位工作台

在原有三栏地图、排班和反馈页面中加入“点击地点即可查看”的公开客流参考。

## 当前四个区域

| 活动区域 | 用作参考的车站 | 2025年日均进出闸次数 |
|---|---|---:|
| UCL Gordon Square | Euston Square | 31,291 |
| Whitechapel Station 周边 | Whitechapel | 51,246 |
| Panda’s Kitchen Angel 周边 | Angel | 33,156 |
| Shepherd’s Bush / Westfield 周边 | Shepherd’s Bush 地铁站系列 | 36,514 |

数值来自 [Marius Comper 的伦敦车站客流汇总](https://mariuscomper.uk/london-station-diary/)，该页面使用 [TfL 开放数据](https://crowding.data.tfl.gov.uk/)。本版在 2026-10-06 核对了公开表内的 2019、2025 年日均数值，未下载原始逐日文件重新计算。因此界面明确标注“TfL 数据的第三方汇总”，不能宣称已直接核验官方原始统计。

这是进闸加出闸的次数，不是去重人数，也不是街道、广场、餐厅或商场的总人数。数据为全年历史日均，不能据此推算某天下午的人流。不同车站系列不相加成区域总量。区域停留人数和停留时长尚无可核实的公开数值。

## 操作

点击左侧列表或地图标记，右侧首先显示历史客流、参考车站、2019年对照、来源和口径。列表按2025年日均车站客流从高到低排列。所有区域的场地许可初始为“待确认”，须核实实际活动范围的管理方和派样要求；规则网页不是获得许可的证明。

原有新增地点、排班、反馈功能保留。活动结果初始为空，避免把原有虚构业绩关联到真实地点。页面填写内容仅在当前页面内存中保存，刷新会重置。公开项目不包含公司内部日报或个人信息。

## 本地打开和更新

使用 VS Code 的 Live Preview 打开 `index.html`。更新 GitHub 时上传根目录的 `index.html`、`style.css`、`app.js`、`README.md`，覆盖同名文件。没有构建步骤或 API 密钥。

底图：© [OpenStreetMap 贡献者](https://www.openstreetmap.org/copyright)。
