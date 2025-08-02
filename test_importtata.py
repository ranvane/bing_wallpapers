import requests

url = "https://bingwallpapers.skerylrode.eu.org/import"  # 替换为你的实际地址

payload = {
    "date": "2025-08-02",
    "title": "Royal Mile, Edinburgh, Scotland (© MEDITERRANEAN/Getty Images)",
    "url": "https://cn.bing.com/th?id=OHR.EdinburghFringe_EN-US5923216873_UHD.jpg&w=3840&h=2160&c=1&rs=1&qlt=80&o=6&dpr=1.25&pid=SANGAM",
    "copyright": "© Bing"
}

# 添加超时和代理设置
proxies = {
    "http": "http://127.0.0.1:7897",
    "https": "https://127.0.0.1:7897"
}

# 禁用 SSL 验证以解决 SSL 错误
resp = requests.post(url, json=payload, timeout=10)
print(resp.status_code, resp.text)