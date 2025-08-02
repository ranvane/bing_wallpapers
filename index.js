export default {
  async fetch(request, env, ctx) {
    try {
      const { pathname } = new URL(request.url);

      if (request.method === "POST" && pathname === "/import") {
        return await handleImport(request, env);
      } else if (pathname === "/") {
        return await renderHome(env);
      } else if (/^\/\d{4}-\d{2}$/.test(pathname)) {
        const month = pathname.slice(1);
        return await renderMonth(month, env);
      } else {
        return new Response("Not Found", { status: 404 });
      }
    } catch (err) {
      return new Response(`内部错误: ${err.message}`, { status: 500 });
    }
  },
};

async function handleImport(request, env) {
  try {
    const items = await request.json();

    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid format: must be a JSON array"
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const dates = [];
    const monthMap = new Map(); // 使用Map来存储每个月份的数据
    let skippedCount = 0; // 记录跳过的项目数

    for (const item of items) {
      if (!item.date || !item.url) continue;

      const date = item.date;
      const month = date.slice(0, 7);
      
      // 检查该日期的数据是否已存在
      const existingData = await env.BING_KV.get(`bing:${date}`, { type: "json" });
      if (existingData) {
        // 如果数据已存在，跳过该项
        skippedCount++;
        continue;
      }

      dates.push(date);
      
      // 将日期按月份分组
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month).push(date);

      await env.BING_KV.put(`bing:${date}`, JSON.stringify(item));
    }

    // 为每个月份更新数据
    for (const [month, monthDates] of monthMap.entries()) {
      const monthKey = `month:${month}`;
      
      const existing = await env.BING_KV.get(monthKey);
      let mergedDates = monthDates;

      if (existing) {
        const prev = JSON.parse(existing);
        const mergedSet = new Set([...prev, ...monthDates]);
        mergedDates = Array.from(mergedSet).sort();
      }

      await env.BING_KV.put(monthKey, JSON.stringify(mergedDates));
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully imported ${dates.length} items, skipped ${skippedCount} existing items`,
      importedCount: dates.length,
      skippedCount: skippedCount,
      months: Array.from(monthMap.keys())
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: "Error importing data: " + err.message
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function renderHome(env) {
  try {
    const list = await env.BING_KV.list({ prefix: "month:" });
    const months = list.keys.map(k => k.name.slice(6)).sort().reverse();

    return new Response(
      renderPage("Bing 历史壁纸月份", renderMonthList(months)),
      { headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  } catch (err) {
    return new Response(`加载主页失败: ${err.message}`, { status: 500 });
  }
}

async function renderMonth(month, env) {
  try {
    const monthKey = `month:${month}`;
    const data = await env.BING_KV.get(monthKey);
    if (!data) return new Response("该月份无数据", { status: 404 });

    const dates = JSON.parse(data);
    const items = await Promise.all(
      dates.map(async (d) => {
        try {
          return await env.BING_KV.get(`bing:${d}`, { type: "json" });
        } catch {
          return null;
        }
      })
    );

    return new Response(
      renderPage(`${month} 壁纸列表`, renderWallpaperList(items)),
      { headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  } catch (err) {
    return new Response(`加载月份失败: ${err.message}`, { status: 500 });
  }
}

// 页面模板渲染函数
// 页面模板渲染函数
function renderPage(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      line-height: 1.6; 
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 15px;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    a { 
      color: #337ab7; 
      text-decoration: none; 
    }
    a:hover { 
      text-decoration: underline; 
    }
    small { 
      color: #666; 
      display: block;
      margin-top: 5px;
    }
    .month-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      list-style: none;
      padding: 0;
    }
    .month-item {
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      text-align: center;
    }
    .wallpaper-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      list-style: none;
      padding: 0;
    }
    .wallpaper-item {
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .wallpaper-item strong {
      display: block;
      margin-bottom: 10px;
      color: #333;
    }
    .wallpaper-image {
      display: block;
      width: 100%;
      height: auto;
      margin: 10px 0;
      border-radius: 3px;
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 30px;
      padding: 10px;
    }
    @media (max-width: 768px) {
      .wallpaper-grid {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }
      .month-list {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
    }
    @media (max-width: 480px) {
      .wallpaper-grid {
        grid-template-columns: 1fr;
      }
      .month-list {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
  </div>
</body>
</html>`;
}

// 主页月份列表渲染
function renderMonthList(months) {
  if (months.length === 0) return "<p>暂无数据</p>";

  return `<h1>Bing 历史壁纸月份</h1>
  <ul class="month-list">
    ${months.map(m => `
      <li class="month-item">
        <a href="/${m}">${m}</a>
      </li>
    `).join("")}
  </ul>`;
}

// 月份页面壁纸列表渲染
function renderWallpaperList(items) {
  const validItems = items.filter(i => i !== null);
  if (validItems.length === 0) return "<p>该月份无壁纸数据</p>";

  return `<h1>壁纸列表</h1>
  <ul class="wallpaper-grid">
    ${validItems.map(item => `
      <li class="wallpaper-item">
        <strong><a id="img_title" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title || "Bing 壁纸"}</a></strong>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">
          <img id="img_url" src="${item.url}" alt="${item.title || "Bing 壁纸"}" loading="lazy" class="wallpaper-image">
        </a>
        <small>${item.copyright || ""}</small>
        
        <strong><a id="img_date" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.date}</a></strong>
      </li>
    `).join("")}
  </ul>
  <div class="back-link">
    <a href="/">← 返回首页</a>
  </div>`;
}
