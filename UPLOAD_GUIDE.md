# 上传到 GitHub 并展示地图

## 1 解压文件

解压 ZIP，打开 `field-marketing-map` 文件夹。里面的 `index.html`、`style.css`、`app.js` 是网页主体。

## 2 新建仓库

在 GitHub 新建一个仓库，名称可以用 `field-marketing-map`。

Description 可以填：

> Interactive map prototype for field marketing location selection, trial scheduling and activity review.

如果用于公开作品集，可以选 Public。GitHub Free 的 Pages 可用于公开仓库；私有仓库的 Pages 可用性取决于账户方案。

## 3 上传文件

1. 在空仓库页面选择上传已有文件；已有文件的仓库可用 **Add file → Upload files**。
2. 拖入解压文件夹里面的文件，然后提交更改。
3. 确保仓库首页直接能看到 `index.html`。不要只上传 ZIP，也不要在仓库根目录外再套一层 `field-marketing-map` 文件夹。

`.nojekyll` 和 `.gitignore` 是辅助文件。如果浏览器文件选择器隐藏它们，主体 HTML、CSS 和 JavaScript 仍可按这里的简单结构发布。

## 4 开启 GitHub Pages

进入 **Settings → Pages**：

- Source：**Deploy from a branch**
- Branch：**main**（如果你的默认分支叫别的名字，选择实际分支）
- Folder：**/(root)**
- 点击 **Save**

发布完成后，在同一页面打开 GitHub 给出的访问地址。仓库的 Actions 页面可以查看发布是否成功。

默认网址形式为 `https://你的GitHub用户名.github.io/field-marketing-map/`，不会带 `chatgpt` 后缀。实际地址以 Pages 页面为准。本地运行方式请先看 `START_HERE.md`。

## 5 检查演示

1. 点击一个地图点位，确认详情切换。
2. 选择“可试推”状态，给一个已确认的点位安排活动。
3. 点击“记录反馈”，选择刚才的活动并填写实际数据。
4. 查看点位状态和汇总指标是否更新。
5. 手机打开链接，查看地图、点位列表和详情。

本版修改只在当前页面暂存，刷新后恢复示例。在线底图需要网络连接；若地图底图暂时未加载，可继续通过左侧列表操作。

## 修改项目内容

- 点位和活动示例：编辑 `app.js` 顶部的 `points` 与 `records`。
- 界面标题和品牌文字：编辑 `index.html`。
- 颜色和排版：编辑 `style.css`。

使用 GitHub 网页修改文件并提交后，Pages 会根据所选分支重新发布。README 中已说明演示数据来源、指标计算与功能边界，提交测试前可以按自己的说法调整项目介绍。

## 官方帮助

- [上传文件](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [配置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
