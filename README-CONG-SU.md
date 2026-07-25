## Mục Tiêu Công Việc

Mỗi khung photobooth cần được xác định đúng các vùng đặt ảnh, gọi là slot. Sau khi chỉnh xong, cộng sự xuất file JSON để chủ dự án nhập lại vào hệ thống.

## Quy Trình Thực Hiện

1. Mở link chế độ cộng sự.

2. Ở tab `Chọn khung`, bấm `Upload` và chọn file khung cần làm.

3. Chờ hệ thống tự nhận diện slot.

4. Chuyển sang tab `Sửa slot` để kiểm tra lại từng vùng slot.

5. Nếu slot bị lệch, bấm vào slot rồi kéo các điểm góc để chỉnh.

6. Nếu thiếu slot, chọn `Thêm slot`, kéo trực tiếp trên khung để vẽ vùng mới.

7. Nếu slot thừa hoặc sai, chọn slot đó rồi bấm nút xóa.

8. Chuyển sang tab `Test ảnh`, tải đúng số ảnh test theo số slot để kiểm tra ảnh có nằm đúng vị trí không.

9. Nếu mọi thứ đã đúng, quay lại `Sửa slot` và bấm `Xuất gói JSON`.

10. Gửi file JSON vừa tải về cho chủ dự án.

## Tiêu Chuẩn Kiểm Tra

Một khung đạt yêu cầu khi:

- Tất cả vị trí đặt ảnh đều có slot.
- Không có slot thừa ở vùng trang trí hoặc nền.
- Slot ôm vừa vùng ảnh, không cắt quá nhiều mặt hoặc thân người.
- Các slot được sắp xếp đúng thứ tự từ trên xuống dưới, từ trái sang phải.
- Ảnh test hiển thị nằm sau lớp khung và không tràn ra ngoài vùng cần ghép.

## Lưu Ý Khi Chỉnh Slot

- Kéo cả vùng slot để di chuyển nhanh.
- Kéo các điểm ở góc để chỉnh hình dạng slot.
- Bấm điểm giữa cạnh để thêm điểm nếu vùng ảnh không phải hình chữ nhật.
- Nếu khung có lỗ trắng hoặc lỗ đen, có thể dùng công cụ nhận diện lại để quét slot.
- Sau khi chỉnh nhiều, nên test bằng ảnh thật trước khi xuất JSON.

## File Cần Gửi Lại

Chỉ gửi file JSON được xuất từ nút:

```text
Xuất gói JSON
```

Không cần gửi ảnh test, trừ khi chủ dự án yêu cầu.

## Khi Gặp Lỗi

Nếu không upload được khung:

- Kiểm tra file có phải ảnh `.jpg`, `.jpeg`, `.png` không.
- Tải lại trang rồi thử lại.

Nếu không xuất được JSON:

- Đảm bảo đã có ít nhất một slot.
- Đảm bảo khung đã được upload thành công.
- Tải lại khung và chỉnh lại nếu cần.

Nếu ảnh test bị lệch:

- Quay lại `Sửa slot`.
- Chọn slot tương ứng.
- Dịch chuyển hoặc kéo lại các điểm của slot.
- Test lại trước khi xuất.

## Bảo Mật

Link cộng sự chỉ dùng để chuẩn hóa khung và xuất JSON. Không chia sẻ link cho người không liên quan đến dự án.
