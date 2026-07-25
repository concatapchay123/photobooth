import cv2
import os

def extract_frame(video_path, output_path, time_sec):
    if not os.path.exists(video_path):
        print(f"Error: {video_path} does not exist")
        return
        
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video file")
        return
        
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    
    print(f"Video Info: {width}x{height}, {fps} FPS, {frame_count} frames total")
    
    frame_idx = int(fps * time_sec)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(output_path, frame)
        print(f"Saved frame at {time_sec}s to {output_path}")
    else:
        print("Error: Could not read frame")
        
    cap.release()

if __name__ == "__main__":
    extract_frame(
        "d:\\my-photobooth\\assets\\temp_user_video.mp4",
        "d:\\my-photobooth\\assets\\extracted_frame.png",
        2.0
    )
