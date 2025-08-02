// 导出默认对象，包含 fetch 方法，这是 Cloudflare Worker 的入口点
export default {
  // 异步 fetch 方法，处理所有传入的请求
  async fetch(request, env, ctx) {
    // 解构 URL 对象，获取路径名
    const { pathname } = new URL(request.url);

    // 如果是 POST 请求且路径为 /import，则调用 handleImport 函数处理
    if (request.method === "POST" && pathname === "/import") {
      return await handleImport(request, env);
    // 如果路径为根路径 /，则调用 renderHome 函数渲染主页
    } else if (pathname === "/") {
      return await renderHome(env);
    // 如果路径匹配 YYYY-MM 格式（如 /2023-05），则处理月度壁纸展示
    } else if (/^\/\d{4}-\d{2}$/.test(pathname)) {
      // 提取月份字符串（去掉开头的斜杠）
      const month = pathname.slice(1);
      // 从 KV 存储中获取该月的壁纸索引
      const index = await env.BING_WALLPAPERS.get(`index_${month}`);
      // 如果索引存在，则渲染该月的壁纸列表
      if (index) {
        const wallpapers = JSON.parse(index);
        // 构造 HTML 内容，展示该月的所有壁纸
        const html = `
          <h1>${month} 壁纸</h1>
          ${wallpapers.map(wallpaper => `
            <div>
              <h2>${wallpaper.title}</h2>
              <p>日期: ${wallpaper.date}</p>
              <p>版权: ${wallpaper.copyright}</p>
              <img src="${wallpaper.url}" alt="${wallpaper.title}">
            </div>
          `).join('')}
        `;
        // 返回 HTML 响应
        return new Response(html, {
          headers: { "Content-Type": "text/html;charset=UTF-8" },
        });
      } else {
        // 如果没有找到该月的索引，返回 404 错误
        return new Response("Not Found", { status: 404 });
      }
    } else {
      // 对于其他路径，返回 404 错误
      return new Response("Not Found", { status: 404 });
    }
  },
};

// 处理导入请求的异步函数
async function handleImport(request, env) {
  // 解析请求体中的 JSON 数据
  const data = await request.json();
  
  // 初始化计数器，用于统计导入和跳过的壁纸数量
  let imported = 0;
  let skipped = 0;
  
  // 创建一个映射，用于存储每月的壁纸索引
  const monthlyIndexes = new Map();
  
  // 遍历所有传入的壁纸数据
  for (const item of data) {
    // 从壁纸数据中提取日期并格式化为 YYYY-MM-DD
    const date = new Date(item.startdate);
    const dateString = date.toISOString().split('T')[0];
    
    // 构造该壁纸在 KV 存储中的键名
    const key = `wallpaper_${dateString}`;
    
    // 检查该壁纸是否已存在于 KV 存储中
    const existing = await env.BING_WALLPAPERS.get(key);
    
    // 如果壁纸不存在，则存储到 KV 存储中
    if (!existing) {
      await env.BING_WALLPAPERS.put(key, JSON.stringify({
        date: dateString,
        title: item.title || '',
        copyright: item.copyright,
        url: item.url,
      }));
      imported++; // 增加导入计数
    } else {
      skipped++; // 增加跳过计数
    }
    
    // 提取年月字符串 (YYYY-MM)
    const month = dateString.substring(0, 7);
    
    // 如果该月的索引尚未创建，则初始化为空数组
    if (!monthlyIndexes.has(month)) {
      monthlyIndexes.set(month, []);
    }
    
    // 将当前壁纸添加到对应月份的索引中
    monthlyIndexes.get(month).push({
      date: dateString,
      title: item.title || '',
      copyright: item.copyright,
      url: item.url,
    });
  }
  
  // 遍历所有月度索引，更新 KV 存储中的月度索引
  for (const [month, wallpapers] of monthlyIndexes) {
    await env.BING_WALLPAPERS.put(`index_${month}`, JSON.stringify(wallpapers));
  }
  
  // 返回导入结果的 JSON 响应
  return new Response(JSON.stringify({ imported, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
}

// 渲染主页的异步函数
async function renderHome(env) {
  // 获取 KV 存储中的所有键，并筛选出月度索引键
  const { keys } = await env.BING_WALLPAPERS.list();
  const monthlyIndexes = keys
    .filter(key => key.name.startsWith('index_'))
    .map(key => key.name.replace('index_', ''))
    .sort()
    .reverse(); // 按月份倒序排列
  
  // 构造主页的 HTML 内容
  const body = `
    <h1>Bing 壁纸</h1>
    <ul>
      ${monthlyIndexes.map(month => `<li><a href="/${month}">${month}</a></li>`).join('')}
    </ul>
  `;
  
  // 构造完整的 HTML 页面
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Bing 壁纸</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px auto; max-width: 800px; padding: 0 10px; }
    img { max-width: 100%; height: auto; margin-top: 5px; margin-bottom: 5px; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
  
  // 返回 HTML 响应
  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}