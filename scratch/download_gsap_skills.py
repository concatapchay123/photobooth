import urllib.request
import zipfile
import io
import os

url = "https://github.com/greensock/gsap-skills/archive/refs/heads/main.zip"
print(f"Downloading {url}...")
try:
    with urllib.request.urlopen(url) as response:
        zip_data = response.read()
    print("Download complete. Extracting...")
    
    with zipfile.ZipFile(io.BytesIO(zip_data)) as zip_ref:
        zip_ref.extractall("scratch")
    print("Extraction complete.")
except Exception as e:
    print(f"Error: {e}")
    print("Trying master branch instead...")
    url_master = "https://github.com/greensock/gsap-skills/archive/refs/heads/master.zip"
    try:
        with urllib.request.urlopen(url_master) as response:
            zip_data = response.read()
        print("Download complete. Extracting...")
        with zipfile.ZipFile(io.BytesIO(zip_data)) as zip_ref:
            zip_ref.extractall("scratch")
        print("Extraction complete.")
    except Exception as e2:
        print(f"Error downloading master: {e2}")
