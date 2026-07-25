import struct
import sys

def get_mp4_dimensions(file_path):
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        
        idx = data.find(b'tkhd')
        if idx == -1:
            print("tkhd atom not found")
            return None
        
        version = data[idx + 4]
        if version == 0:
            offset = idx + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36
        elif version == 1:
            offset = idx + 4 + 4 + 8 + 8 + 4 + 4 + 8 + 8 + 2 + 2 + 2 + 2 + 36
        else:
            print(f"Unknown version {version}")
            return None
            
        width_fp = struct.unpack('>I', data[offset:offset+4])[0]
        height_fp = struct.unpack('>I', data[offset+4:offset+8])[0]
        
        return width_fp >> 16, height_fp >> 16
    except Exception as e:
        print("Error parsing MP4:", e)
        return None

if __name__ == "__main__":
    path = "d:\\my-photobooth\\assets\\temp_user_video.mp4"
    dims = get_mp4_dimensions(path)
    print(f"File: {path}")
    print(f"Dimensions: {dims}")
