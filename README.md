# Bing_Wallpapers

这是一个Python脚本,用于批量下载Bing每日壁纸。

## 功能

- 根据指定的日期范围生成Bing壁纸网站URL
- 从生成的URL中提取壁纸下载链接
- 支持选择2K或4K分辨率
- 使用多线程并行下载壁纸
- 将下载的壁纸保存到指定目录

## 依赖

- Python 3.6+
- requests
- lxml

## 安装

1. 克隆此仓库:
```
git clone https://github.com/yourusername/bing_wallpapers.git cd bing_wallpapers
```
2. 安装依赖:
```
pip install -r requirements.txt
# 或者
pip install requests lxml
```
## 使用
1. 打开 `bing_wallpapers.py` 文件。

2. 在文件底部的 `if __name__ == "__main__":` 部分,修改以下参数:
```python
start_date = "2023-01"  # 开始日期
end_date = "2023-12"    # 结束日期
resolution = "2k"       # 分辨率,可选 '2k' 或 '4k'
save_directory = "bing_wallpapers"  # 保存目录
max_threads = 2         # 最大线程数

```
3. 运行脚本:
```
python bing_wallpapers.py
```

## 注意事项
- 确保您的网络连接稳定
- 请确保您有足够的磁盘空间来保存下载的壁纸,特别是当选择4K分辨率时。
- 下载大量图片时要注意网站的使用政策,避免给服务器带来过大压力。
- 如果遇到网络问题,可能需要调整 max_threads 参数或添加重试机制。

## 致谢
感谢 Bing 和 wdbyte.com 提供的精美壁纸资源。