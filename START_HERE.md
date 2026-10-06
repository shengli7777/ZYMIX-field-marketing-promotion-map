# 先在自己电脑上运行

这是一套完整的 HTML + CSS + JavaScript 网页源代码。推荐用 **VS Code 桌面版 + Microsoft Live Preview 扩展** 打开。使用这个方法，不需要安装 Python、Node.js 或购买 API key。

## 第一步：安装软件

1. 在 https://code.visualstudio.com/ 下载适合电脑系统的 Visual Studio Code（Windows 或 macOS），安装并打开。
2. 点击左侧“扩展 / Extensions”图标，搜索 **Live Preview**。
3. 确认发布者为 **Microsoft**，扩展标识为 `ms-vscode.live-server`，点击 Install。
   官方扩展链接：https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server

## 第二步：打开代码文件夹

1. 把下载的 ZIP 完整解压。
2. 在 VS Code 中选择 **File → Open Folder（文件 → 打开文件夹）**。
3. 选择解压后的 `field-marketing-map` 文件夹。左侧应直接看到 `index.html`、`style.css` 和 `app.js`。不要只打开一个文件或在压缩包内打开。

## 第三步：运行网页

1. 点击左侧的 `index.html`。
2. 点击编辑器右上角的预览按钮，或在编辑器中右键选择 Live Preview 的预览菜单。
3. 地推地图会在预览窗口打开。如需更大画面，在预览窗口菜单中选择在浏览器中打开。
4. 显示的本地地址一般以 `http://127.0.0.1:` 或 `http://localhost:` 开头，端口以扩展实际显示为准。这是自己电脑上的地址，不是可发给他人的公开网址。

## 第四步：自己跑一遍工作流

1. 点地图标记，右侧会显示点位信息。
2. 点击“新增点位”，再在地图上点击位置，填写信息并保存。
3. 将点位开展活动的许可状态改成“已确认”，安排一次试推。
4. 为活动记录反馈，填写扫描数、注册数、实际人时和费用。
5. 查看汇总指标，试试搜索、筛选、暂停与重新启用。

**这是演示版：点位和活动数据都是虚构的，修改只在当前页面保留，刷新后恢复初始示例。地图底图需要联网。**

## 想改什么，打开哪个文件？

| 目标 | 文件 |
| --- | --- |
| 改标题、说明和界面文案 | `index.html` |
| 改颜色、字号和布局 | `style.css` |
| 改示例点位、活动记录和业务规则 | `app.js` |
| 了解项目逻辑和指标计算 | `README.md` |
| 上传 GitHub，生成公开访问链接 | `UPLOAD_GUIDE.md` |

修改代码后保存，Live Preview 会自动刷新；当前页面里临时填写的数据也会随刷新重置。

## 已有 Python 时的备用方法

在 VS Code 的 **Terminal → New Terminal（终端 → 新建终端）** 中，确认当前目录是项目文件夹。

Windows：
```bash
py -m http.server 8000 --bind 127.0.0.1
```

macOS / Linux：
```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

然后在 Chrome、Edge 或 Safari 中打开 `http://localhost:8000`。结束时在终端按 `Ctrl+C`。如果提示找不到 Python，直接用前面的 Live Preview 方法即可。

## 常见问题

- **预览按钮没有出现：**检查 Microsoft Live Preview 是否安装并启用，以及当前打开的是 `index.html`。
- **有文字但没有样式：**确认三个主体文件在同一文件夹，名称没有更改，并从完整文件夹启动。
- **点位和按钮正常，但底图空白：**底图从 OpenStreetMap 在线加载，检查网络；点位列表和工作流仍可操作。
- **刷新后新数据不见了：**这是当前演示版的预期行为，尚未连接数据库。

## 公开网址不带 ChatGPT 后缀

按 `UPLOAD_GUIDE.md` 发布到你自己的 GitHub Pages 后，默认地址形式是：

`https://你的GitHub用户名.github.io/field-marketing-map/`

这里只是地址格式，实际链接以 GitHub 的 Settings → Pages 页面显示为准。代码可以独立运行，不依赖原来的托管网址。

参考：[Microsoft Live Preview](https://github.com/microsoft/vscode-livepreview) · [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
