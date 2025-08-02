import requests

# url = "https://bingwallpapers.skerylrode.eu.org/import"  # 替换为你的实际地址


url = "http://127.0.0.1:8787/import"

items = [
    {
        "date": "2025-08-01",
        "title": "Some Title 1",
        "url": "https://cn.bing.com/th?id=OHR.BabyLemur_EN-US9264861498_UHD.jpg&rf=LaDigue_UHD.jpg&pid=hp&w=3840&h=2160&rs=1&c=4",
        "copyright": "© Bing"
    },
    {
        "date": "2025-08-02",
        "title": "Royal Mile, Edinburgh, Scotland (© MEDITERRANEAN/Getty Images)",
        "url": "https://cn.bing.com/th?id=OHR.EdinburghFringe_EN-US5923216873_UHD.jpg&w=3840&h=2160&c=1&rs=1&qlt=80&o=6&dpr=1.25&pid=SANGAM",
        "copyright": "© Bing"
    }
]

resp = requests.post(url, json=items, timeout=10)
print(resp.status_code)
print(resp.text)
