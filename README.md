# 我的导航

一个零依赖的静态个人导航站，部署在 Cloudflare Pages。

## 如何使用

直接编辑 `index.html` 中的配置区即可增删站点：

```javascript
const SITE_TITLE = "我的导航";

const DATA = [
  {
    group: "常用",
    items: [
      { name: "GitHub", url: "https://github.com", desc: "代码托管", icon: "G" }
    ]
  }
];
```

- `group` 分组名
- `name` 显示名称
- `url` 跳转链接
- `desc` 副标题（可留空）
- `icon` emoji 或单个字符，不填自动取名字首字母

## Cloudflare Pages 部署

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选择本仓库
3. 构建配置**全部留空**：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: 留空（或 `/`）
4. Deploy

## License

MIT
