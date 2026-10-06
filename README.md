# Field Marketing Point Map

An interactive map prototype for selecting field marketing locations, scheduling small trials and reviewing activity feedback. Built as a personal project based on field marketing workflow experience.

**中文界面。All point names, ratings and activity records are synthetic examples.** Coordinates illustrate the interface around central London; they are not verified venue recommendations. The ZYMIX label provides the project context and does not imply an official company product.

## What it does

- Explore and select locations on a draggable, zoomable map.
- Search locations and filter by workflow status or indoor/outdoor setting.
- Add a candidate by clicking its position on the map.
- Record whether a location can host an activity.
- Schedule a trial with a date, time, team size, duration and responsible person.
- Submit feedback against a scheduled trial, or add an activity retrospectively.
- Calculate registrations, scan-to-registration conversion, registrations per person-hour and cost per registration.
- Pause and reopen a location as operational conditions change.

## Workflow

1. **Collect candidates:** record location, audience fit, willingness to stop, accessibility and weather suitability.
2. **Confirm feasibility:** locations awaiting confirmation remain candidates. Confirmed, active locations can be scheduled.
3. **Run a small trial:** specify time, team and execution notes.
4. **Record actual results:** capture person-hours, scans, registrations, total cost and field observations.
5. **Review and repeat:** compare several activities, adjust timing or pause a location when appropriate.

### Initial screening score

Each factor is rated from 1 to 5. The prototype uses illustrative weights, not a validated company scoring model:

| Factor | Weight |
|---|---:|
| Target audience fit | 35% |
| Willingness to stop and talk | 35% |
| Access and execution convenience | 15% |
| Weather suitability | 15% |

The weighted average is multiplied by 20 to produce a score out of 100. This score prioritises trials; it does not predict registrations. Location feasibility is checked separately.

### Activity metrics

| Metric | Calculation |
|---|---|
| Registrations | Sum of registrations from completed activities |
| Conversion | Total registrations / total scans |
| Registrations per person-hour | Total registrations / total actual person-hours |
| Cost per registration | Total actual cost / total registrations |

Ratios use the matching totals, rather than averaging activity-level rates. Planned activities are excluded. A zero denominator displays a dash. Cost should include all relevant activity spending. Person-hours are the sum of each team member's actual working hours.

The feedback form assumes scans and registrations use the same activity attribution window. It rejects registrations above scans for this simplified model; an operational system may need a different rule for delayed or cross-device attribution.

## Run locally

For a no-command setup, use VS Code with Microsoft's Live Preview extension. Follow [中文运行说明](START_HERE.md).

No build step, npm installation or API key is required. With Python installed, run from this project folder:

```bash
python -m http.server 8000
```

On Windows, `py -m http.server 8000` can also be used. Open `http://localhost:8000` in a modern browser. Internet access is required for map tiles. If tiles are unavailable, the point list and workflow controls remain available.

## Publish on GitHub Pages

Upload the contents of this folder to the root of a repository, so `index.html` is at the top level. In **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. Use the URL shown by GitHub once deployment completes.

See [上传和发布指南](UPLOAD_GUIDE.md) for Chinese instructions.

## Source files

| File | Purpose |
|---|---|
| `index.html` | Main interface and page metadata |
| `style.css` | Desktop and mobile layouts |
| `app.js` | Demo data, map projection, state transitions, forms and calculations |
| `START_HERE.md` | Chinese local setup and walkthrough |
| `UPLOAD_GUIDE.md` | GitHub upload and publishing instructions |

The application uses plain HTML, CSS and JavaScript. Relative asset paths support GitHub Pages project URLs. An optional, feature-detected WebMCP tool selects a location in compatible browsers; it is not required for ordinary use.

## Prototype limits

- Changes live only in page memory and reset on refresh. There is no database, shared editing or account system.
- Dates, permissions and results in the initial data are fictional examples.
- Ratings are entered when a point is created. Historical feedback updates activity metrics, not the initial screening ratings.
- This version does not include live traffic estimates, route planning or verified venue availability.
- JavaScript syntax and representative calculation, state and coordinate-conversion checks were completed. Full browser interaction testing and optional WebMCP validation have not been completed.

## Map attribution and references

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Raster tiles are loaded on demand from OpenStreetMap. Attribution is displayed on the map. There is no bulk download or offline tile cache.

- [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Uploading repository files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## 中文项目简介

这个项目把地推的选点、试推、排班和反馈放在同一张地图里。选点时同时考虑目标人群和愿意停下来交流的人流，再用实际活动数据复核判断。适合作为工作流设计与空间数据应用的个人演示项目。目前所有示例均为虚构数据，刷新页面后会恢复初始状态。
