# Bing_Wallpapers


本项目[Bing_Wallpapers](https://github.com/ranvane/Bing_Wallpapers)是[wallpaper-changer](https://github.com/ranvane/wallpaper-changer)的配套项目。

### 目的：

旨在通过自己部署Bing_Wallpapers，为wallpaper-changer提供安全可靠的壁纸数据api。

### 注意：

本项目初始数据来自[bing-wallpaper](https://github.com/niumoo/bing-wallpaper)。



### 部署

1、github actions 部署
    工作流会自动部署每日壁纸数据导入到数据库中。
    

2、cloudflare pages部署
- 创建Kv存储空间，并绑定。
- 配置 IMPORT_PASSWORD 环境变量作为密码，用于导入数据。
- daily_import.py 脚本用于导入数据，需要和cloudflare pages中配置环境变量 IMPORT_PASSWORD 相同。
- 将worker.js代码部署到cloudflare pages中。


### 注意事项：

请勿将数据用于商业用途。

