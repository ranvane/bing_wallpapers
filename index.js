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
      return new Response("Invalid format: must be a JSON array", { status: 400 });
    }

    const dates = [];
    const monthSet = new Set();

    for (const item of items) {
      if (!item.date || !item.url) continue;

      const date = item.date;
      const month = date.slice(0, 7);
      dates.push(date);
      monthSet.add(month);

      await env.BING_KV.put(`bing:${date}`, JSON.stringify(item));
    }

    // 每月只允许同一批为同一月，否则报错
    if (monthSet.size !== 1) {
      return new Response("All items must belong to the same month", { status: 400 });
    }

    const month = Array.from(monthSet)[0];
    const monthKey = `month:${month}`;

    const existing = await env.BING_KV.get(monthKey);
    let mergedDates = dates;

    if (existing) {
      const prev = JSON.parse(existing);
      const mergedSet = new Set([...prev, ...dates]);
      mergedDates = Array.from(mergedSet).sort();
    }

    await env.BING_KV.put(monthKey, JSON.stringify(mergedDates));

    return new Response(`Successfully imported ${dates.length} items for ${month}`, {
      status: 200
    });
  } catch (err) {
    return new Response("Error importing data: " + err.message, { status: 500 });
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
function renderPage(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    a { color: #337ab7; text-decoration: none; }
    a:hover { text-decoration: underline; }
    small { color: #666; }
    img { max-width: 100%; height: auto; margin-top: 5px; margin-bottom: 5px; }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

// 主页月份列表渲染
function renderMonthList(months) {
  if (months.length === 0) return "<p>暂无数据</p>";

  return `<h1>Bing 历史壁纸月份</h1>
  <ul>
    ${months.map(m => `<li><a href="/${m}">${m}</a></li>`).join("")}
  </ul>`;
}

// 月份页面壁纸列表渲染
function renderWallpaperList(items) {
  const validItems = items.filter(i => i !== null);
  if (validItems.length === 0) return "<p>该月份无壁纸数据</p>";

  return `<h1>壁纸列表</h1>
  <ul>
    ${validItems.map(item => `
      <li>
        <strong>${item.date}</strong>: 
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title || "查看大图"}</a><br>
        <img src="${item.url}" alt="${item.title || "Bing 壁纸"}" loading="lazy" width="480"><br>
        <small>${item.copyright || ""}</small>
      </li>
    `).join("")}
  </ul>
  <p><a href="/">← 返回首页</a></p>`;
}
