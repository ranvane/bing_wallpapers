export default {
  async fetch(request, env, ctx) {
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
  },
};

async function handleImport(request, env) {
  let entries;
  try {
    const body = await request.json();
    entries = Array.isArray(body) ? body : [body];
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  let imported = 0;
  let skipped = 0;

  for (const data of entries) {
    const { date, title, url, copyright } = data;
    if (!date || !url || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      skipped++;
      continue;
    }

    const dayKey = `bing:${date}`;
    const existing = await env.BING_KV.get(dayKey, { type: "json" });

    if (existing && existing.url === url) {
      skipped++;
      continue;
    }

    await env.BING_KV.put(dayKey, JSON.stringify({ date, title, url, copyright }));

    // 更新月索引
    const month = date.slice(0, 7);
    const monthKey = `month:${month}`;
    let monthData = [];

    try {
      const existingMonth = await env.BING_KV.get(monthKey);
      monthData = existingMonth ? JSON.parse(existingMonth) : [];
    } catch {}

    if (!monthData.includes(date)) {
      monthData.push(date);
      monthData.sort();
      await env.BING_KV.put(monthKey, JSON.stringify(monthData));
    }

    imported++;
  }

  return new Response(
    JSON.stringify({ imported, skipped, total: entries.length }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

async function renderHome(env) {
  const list = await env.BING_KV.list({ prefix: "month:" });
  const months = list.keys.map(k => k.name.slice(6)).sort().reverse();

  const links = months.map(m => `<li><a href="/${m}">${m}</a></li>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bing 壁纸月份</title></head><body>
  <h1>Bing 历史壁纸月份</h1>
  <ul>${links}</ul>
  </body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
}

async function renderMonth(month, env) {
  const monthKey = `month:${month}`;
  const data = await env.BING_KV.get(monthKey);
  if (!data) return new Response("该月份无数据", { status: 404 });

  const dates = JSON.parse(data);
  const rows = await Promise.all(
    dates.map(async (d) => {
      const item = await env.BING_KV.get(`bing:${d}`, { type: "json" });
      if (!item) return "";
      return `<li>
        <strong>${item.date}</strong>: <a href="${item.url}" target="_blank">${item.title || "查看大图"}</a><br>
        <img src="${item.url}" width="480" loading="lazy"><br>
        <small>${item.copyright || ""}</small>
      </li>`;
    })
  );

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${month} 壁纸列表</title></head><body>
  <h1>${month} 壁纸列表</h1>
  <ul>${rows.join("")}</ul>
  <p><a href="/">← 返回首页</a></p>
  </body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
}
