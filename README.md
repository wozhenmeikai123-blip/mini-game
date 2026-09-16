# Mini Game

**Original Author:** Zhijun Chen  
**Copyright:** © 2026 Zhijun Chen  
**License:** Apache License 2.0

This project was originally developed by Zhijun Chen.

The source code is licensed under the Apache License 2.0.
Please retain the applicable copyright, license, and attribution notices
when redistributing the project.




一个基于浏览器的小游戏合集，包含井字棋、黑白棋和数字华容道。项目使用原生 HTML、CSS、JavaScript 构建页面，由 Node.js 提供接口和静态文件服务，并通过 Socket.IO 支持实时对战。

## 功能

| 游戏 | 玩法 |
| --- | --- |
| 井字棋 | 本地双人对战、在线随机匹配 |
| 黑白棋 | 本地双人对战、单人对战电脑、在线随机匹配 |
| 数字华容道 | 4 × 4 数字滑块拼图、进度保存与读取、按最少步数排序的前 10 名排行榜 |

此外，项目支持用户注册和登录；密码使用 bcrypt 哈希后存入 PostgreSQL。服务端提供 `/health` 健康检查接口和 `/metrics` Prometheus 指标接口。

> 项目中的“数字华容道”是 15 数字滑块拼图，并非传统的曹操华容道棋盘。

## 技术栈

- 前端：HTML、CSS、原生 JavaScript
- 后端：Node.js、Express、Socket.IO
- 数据库：PostgreSQL
- 其他：bcrypt、prom-client、Docker Compose

## 快速开始

### 使用 Docker Compose

确保已安装 Docker 和 Docker Compose，在项目根目录运行：

```bash
docker compose up --build
```

打开 [http://localhost:8080](http://localhost:8080)，注册账号后即可进入游戏。首次创建数据库时，Compose 会通过 `init.sql` 建表。数据保存在 Docker 卷 `db_data` 中，重启容器后仍会保留。

停止服务：

```bash
docker compose down
```

`compose.yaml` 中的数据库账号和密码均为开发示例值 `postgres`。公开部署前请修改密码和对应的服务端环境变量，并按部署环境配置数据库访问。

### 使用本机 Node.js

建议使用 Node.js 20（与 Dockerfile 使用的版本一致），并安装 PostgreSQL。先创建名为 `game` 的数据库，再执行 `init.sql` 初始化表；随后安装依赖：

```bash
npm ci
```

服务端读取以下变量：

| 变量 | 说明 | 本地示例 |
| --- | --- | --- |
| `DB_HOST` | 数据库主机 | `localhost` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_USER` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | 你的数据库密码 |
| `DB_NAME` | 数据库名称 | `game` |
| `PORT` | HTTP 服务端口，可选 | `8080` |

例如，在 PowerShell 中可以这样启动（将密码替换为自己的数据库密码）：

```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "你的数据库密码"
$env:DB_NAME = "game"
npm start
```

然后通过 `http://localhost:8080` 访问。项目目前不会自动读取 `.env` 文件，需通过终端或部署平台提供环境变量。

## 项目结构

```text
.
├── frontend/          # 各游戏、登录页、首页和排行榜页面
├── server.js          # HTTP 接口、静态文件服务和在线对战逻辑
├── init.sql           # PostgreSQL 数据表
├── package.json       # Node.js 依赖与启动命令
├── Dockerfile         # 后端容器镜像
├── compose.yaml       # 本地运行后端与数据库
└── docker-stack.yaml  # Docker Stack 部署配置
```

## 主要接口

| 接口 | 用途 |
| --- | --- |
| `POST /register`、`POST /login` | 注册、登录 |
| `POST /api/klotski/save`、`POST /api/klotski/load` | 保存、读取数字华容道进度 |
| `GET /api/klotski/leaderboard` | 获取前 10 名成绩 |
| `POST /api/klotski/leaderboard/save` | 提交最佳步数 |
| `GET /health` | 健康检查 |
| `GET /metrics` | Prometheus 指标 |

在线井字棋和黑白棋通过 Socket.IO 通信；两名玩家进入相应的在线页面后会进行随机匹配。

## 当前实现说明

- 排行榜只统计数字华容道成绩，按完成步数从少到多排序。
- 登录状态目前仅以浏览器 `localStorage` 中的用户名表示，后端的游戏数据接口没有会话鉴权。若要公开部署，应先补充身份验证与访问控制。
- 在线对局状态保存在服务端内存中；`docker-stack.yaml` 虽配置了多个副本，但当前代码没有共享对局状态或跨副本的 Socket.IO 适配器，多副本部署需要额外配置。

## 作者与许可证

- 作者：Zhijun Chen
- 原始仓库：[wozhenmeikai123-blip/mini-game](https://github.com/wozhenmeikai123-blip/mini-game)
- 版权：Copyright © 2026 Zhijun Chen.
- 许可证：Apache License 2.0
