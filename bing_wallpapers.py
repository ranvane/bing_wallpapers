from datetime import datetime, timedelta
import requests
from lxml import html
import re
import os
from concurrent.futures import ThreadPoolExecutor
import threading
import logging

# 配置日志
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')


def download_wallpaper(url, save_dir):
    """
    下载壁纸并保存到指定目录
    """
    try:
        # 从URL中提取文件名
        file_name = url.split('id=')[1].split('&')[0] + '.jpg'
        file_path = os.path.join(save_dir, file_name)

        # 发送GET请求下载图片
        # 设置伪造的User-Agent
        headers = {
            'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, stream=True, headers=headers)
        response.raise_for_status()  # 如果请求不成功则抛出异常

        # 保存图片
        with open(file_path, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                file.write(chunk)

        logging.info(f"保存名: {file_name}\n下载链接：{url}")
    except Exception as e:
        logging.error(f"下载错误： {url}: {str(e)}")


def download_wallpapers(wallpaper_links, save_dir, max_threads=5):
    """
    使用多线程下载壁纸
    """
    # 确保保存目录存在
    os.makedirs(save_dir, exist_ok=True)

    # 创建线程池
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        # 提交下载任务
        futures = [
            executor.submit(download_wallpaper, url, save_dir)
            for url in wallpaper_links
        ]

        # 等待所有任务完成
        for future in futures:
            future.result()


def get_bing_wallpaper_links(url, resolution='2k'):
    # 设置伪造的User-Agent
    headers = {
        'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    # 发送HTTP请求获取网页内容
    response = requests.get(url, headers=headers)

    # 解析HTML
    tree = html.fromstring(response.content)

    # 使用XPath提取链接
    links = tree.xpath(
        "//div[@id='img_list']/div[@class='w3-third ']/p/a/@href")

    # 根据分辨率设置参数
    if resolution == '4k':
        width, height = 3840, 2160
    else:  # 默认为2k
        width, height = 2560, 1440

    # 修改链接中的分辨率参数
    modified_links = []
    for link in links:
        # 使用正则表达式替换宽度和高度
        modified_link = re.sub(r'w=\d+&h=\d+', f'w={width}&h={height}', link)
        modified_links.append(modified_link)

    return modified_links


def generate_wdbyte_urls(start_date, end_date):
    """
    生成指定日期范围内的Bing壁纸网站wdbyte.com URL

    :param start_date: 开始日期，格式为 'YYYY-MM'
    :param end_date: 结束日期，格式为 'YYYY-MM'
    :return: 生成的URL列表
    """
    urls = []
    current_date = datetime.strptime(start_date, "%Y-%m")
    end = datetime.strptime(end_date, "%Y-%m")

    while current_date <= end:
        url = f"https://bing.wdbyte.com/{current_date.strftime('%Y-%m')}"
        urls.append(url)

        # 移到下一个月
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1,
                                                month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)

    return urls


def print_run_parameters(start_date, end_date, resolution, save_directory,
                         max_threads):
    """
    打印运行参数
    """
    logging.info("*" * 30)
    logging.info("运行参数:")
    logging.info(f"开始日期: {start_date}")
    logging.info(f"结束日期: {end_date}")
    logging.info(f"分辨率: {resolution}")
    logging.info(f"保存目录: {save_directory}")
    logging.info(f"最大线程数: {max_threads}")
    logging.info("*" * 30+'\n')


if __name__ == "__main__":
    start_date = "2023-01"
    end_date = "2023-12"
    resolution = "2k"  # 可以是 '2k' 或 '4k'
    save_directory = "bing_wallpapers"
    max_threads = 6  # 可以根据需要调整线程数

    # 打印运行参数
    print_run_parameters(start_date, end_date, resolution, save_directory,
                         max_threads)

    generated_urls = generate_wdbyte_urls(start_date, end_date)

    # 记录生成的URL
    for url in generated_urls:
        logging.info(f"处理链接: {url}")
        wallpaper_links = get_bing_wallpaper_links(url, resolution)

        # 记录获取到的壁纸链接数量
        logging.info(f"在链接{url}中发现 {len(wallpaper_links)} 个壁纸链接.")

        # 下载壁纸
        download_wallpapers(wallpaper_links, save_directory, max_threads)

    logging.info("下载完成.")
