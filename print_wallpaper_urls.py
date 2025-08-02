import os
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import requests
import time
import json

def clean_url(url):
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    allowed_keys = ['id', 'th']
    filtered_query = {k: v for k, v in query.items() if k in allowed_keys}
    new_query = urlencode(filtered_query, doseq=True)
    return urlunparse(parsed._replace(query=new_query, params='', fragment=''))

cell_pattern = re.compile(
    r'!\[\]\((https://[^\)]+)\)\s*(\d{4}-\d{2}-\d{2})'
)

results = []
base_dir = './zh-cn'  # 替换为你的 Markdown 文件目录

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.md'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

                for line in content.splitlines():
                    if not line.strip().startswith("|") or "---" in line:
                        continue

                    cells = line.strip().split("|")[1:-1]
                    for cell in cells:
                        match = cell_pattern.search(cell)
                        if match:
                            raw_url, date = match.groups()
                            clean = clean_url(raw_url)
                            record = {
                                "date": date,
                                "url": clean,
                                "title": clean.replace("https://cn.bing.com/th?id=", "").replace("_UHD.jpg", ""),
                                "copyright": "© Bing"
                            }
                            results.append(record)

def submit_batch(data, url, max_retries=3):
    """
    提交一批数据，包含重试机制
    """
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=data, timeout=30)
            if resp.status_code == 200:
                result = resp.json()
                print(f"成功提交 {len(data)} 项数据: {result}")
                return True
            else:
                print(f"提交失败，状态码: {resp.status_code}, 响应: {resp.text}")
        except requests.exceptions.RequestException as e:
            print(f"第 {attempt + 1} 次尝试提交失败: {e}")
            if attempt < max_retries - 1:
                print(f"等待 5 秒后重试...")
                time.sleep(5)
            else:
                print(f"达到最大重试次数，提交失败")
    return False

def submit_data_in_batches(data, url, batch_size=50):
    """
    分批提交数据
    """
    total_items = len(data)
    successful_items = 0
    failed_batches = []
    
    print(f"开始提交 {total_items} 项数据，每批 {batch_size} 项")
    
    for i in range(0, total_items, batch_size):
        batch = data[i:i + batch_size]
        batch_number = i // batch_size + 1
        total_batches = (total_items + batch_size - 1) // batch_size
        
        print(f"提交批次 {batch_number}/{total_batches} ({len(batch)} 项)...")
        
        if submit_batch(batch, url):
            successful_items += len(batch)
        else:
            failed_batches.append((batch_number, batch))
            print(f"批次 {batch_number} 提交失败")
        
        # 添加延迟以避免对服务器造成过大压力
        if i + batch_size < total_items:
            print(f"等待 2 秒后继续提交下一批...")
            time.sleep(2)
    
    # 重试失败的批次
    if failed_batches:
        print(f"\n重试 {len(failed_batches)} 个失败的批次...")
        for batch_number, batch in failed_batches:
            print(f"重试批次 {batch_number}...")
            if submit_batch(batch, url):
                successful_items += len(batch)
                failed_batches = [(bn, b) for bn, b in failed_batches if bn != batch_number]
            time.sleep(2)
    
    print(f"\n提交完成: 成功 {successful_items}/{total_items} 项数据")
    if failed_batches:
        print(f"仍有 {len(failed_batches)} 个批次提交失败")
        # 可选：将失败的数据保存到文件中
        failed_data = [item for _, batch in failed_batches for item in batch]
        with open('failed_import_data.json', 'w', encoding='utf-8') as f:
            json.dump(failed_data, f, ensure_ascii=False, indent=2)
        print(f"失败的数据已保存到 failed_import_data.json")



if __name__ == "__main__":
    # 按日期筛选数据（如果需要）
    target_month = "2025-07"
    # filtered_results = [item for item in results if item["date"].startswith(target_month)]
    filtered_results=results
    url = "https://bingwallpapers.skerylrode.eu.org/import"
    batch_size=50

    if filtered_results:
        print(f"找到 {len(filtered_results)} 项 {target_month} 的数据")
        # for item in filtered_results[:5]:  # 只打印前5项作为示例
        #     print(f"{item}")
        
        
        submit_data_in_batches(filtered_results, url, batch_size=batch_size)
    else:
        print(f"未找到 {target_month} 的数据")