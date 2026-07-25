with open("d:/my-photobooth/src/App.jsx", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "const captureGuestPhotoFrame = async () =>" in line:
            print(f"Line {idx}: {line.strip()}")
        if "const startGuestCaptureSession = async () =>" in line:
            print(f"Line {idx}: {line.strip()}")
