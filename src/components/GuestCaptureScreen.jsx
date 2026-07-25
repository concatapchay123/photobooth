import React from 'react';
import { ArrowLeft, ArrowRight, Camera, Images, Loader2, RefreshCcw, Sparkles, VideoOff } from 'lucide-react';
import BeautyFilterCamera from '../BeautyFilterCamera.jsx';
import { BEAUTY_FILTER_PRESETS } from '../beautyFilterSettings.js';

export default function GuestCaptureScreen({
  isCaptureUnlocked,
  isCaptureLocked,
  resetGuestFlow,
  isLockedCaptureRunning,
  isCapturingGuestPhoto,
  guestNotice,
  guestStep,
  boothMode,
  cameraStream,
  beautyFilterSettings,
  isKioskGuardEnabled,
  onCameraFrameRef,
  capturedPhotos,
  maxGuestPhotos,
  isCameraReconnecting,
  cameraDevices,
  selectedCameraId,
  handleCameraChange,
  IS_DSLR_MODE_ENABLED,
  useDslrTrigger,
  setUseDslrTrigger,
  showDslrGuide,
  setShowDslrGuide,
  captureCountdown,
  flashActive,
  cameraError,
  startGuestJourney,
  handleClearAndRetake,
  startGuestCaptureSession,
  minGuestPhotosToContinue,
  nextCaptureSecondsLeft,
  activeBeautyPresetId,
  applyBeautyPreset,
  isUsingFallbackCameraRef,
  canFinishCaptureEarly,
  requestFinishCaptureEarly,
  beautyCameraRef
}) {
  return (
    <div className="w-screen h-[100dvh] shrink-0 overflow-hidden relative flex flex-col justify-center items-center pt-[108px] pb-8 px-4 md:px-8" style={{ boxSizing: 'border-box' }}>
      <section id="guest-capture" className={`pink-step ${isCaptureUnlocked ? 'active' : ''} ${isCaptureLocked ? 'locked' : ''}`} data-disabled={!isCaptureUnlocked || isCaptureLocked}>
          <div className="pink-step-dot"><span /></div>
          <div className="pink-card pink-capture-card p-5 md:p-6 lg:max-w-none">
            
            <div className="flex flex-col lg:flex-row gap-6 items-stretch flex-1 h-full w-full justify-center">
              {/* Left Column: Camera and Capture buttons */}
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={resetGuestFlow}
                      disabled={isLockedCaptureRunning || isCapturingGuestPhoto}
                      className="pink-outline-btn size-10 !p-0 !min-h-0 rounded-full flex items-center justify-center cursor-pointer border-pink-200 hover:border-pink-500 shadow-sm"
                      title="Quay về màn hình chính"
                    >
                      <ArrowLeft className="size-5" />
                    </button>
                    <h2 className="pink-step-headline">1. Chụp ảnh</h2>
                  </div>
                </div>

                {guestNotice && guestStep === 'capture' && (
                  <p className="pink-alert m-0">{guestNotice}</p>
                )}

                <div className={`pink-camera relative mb-2 ${boothMode === 'id_photo' ? 'pink-camera-id' : 'pink-camera-large'}`}>
                  {guestStep === 'capture' && (
                    <BeautyFilterCamera
                      ref={beautyCameraRef}
                      stream={cameraStream}
                      settings={beautyFilterSettings}
                      mirror
                      disableWebGl={isKioskGuardEnabled}
                      onFrame={(canvas) => {
                        if (onCameraFrameRef.current) {
                          onCameraFrameRef.current(canvas);
                        }
                      }}
                    />
                  )}
                  
                  {boothMode === 'id_photo' && (
                    <div className="id-photo-guideline-overlay">
                      <svg
                        viewBox="0 0 300 400"
                        preserveAspectRatio="xMidYMid meet"
                        className="absolute inset-0 w-full h-full pointer-events-none select-none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <ellipse
                          cx="150" cy="169"
                          rx="75" ry="100"
                          fill="none"
                          stroke="#ff2f93"
                          strokeWidth="2.5"
                          strokeDasharray="8 4"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                        <path
                          d="M 125 269 L 125 305 M 175 269 L 175 305"
                          fill="none"
                          stroke="#ff2f93"
                          strokeWidth="2.5"
                          strokeDasharray="8 4"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                        <path
                          d="M 125 305 C 95 310, 50 335, 10 375"
                          fill="none"
                          stroke="#ff2f93"
                          strokeWidth="2.5"
                          strokeDasharray="8 4"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                        <path
                          d="M 175 305 C 205 310, 250 335, 290 375"
                          fill="none"
                          stroke="#ff2f93"
                          strokeWidth="2.5"
                          strokeDasharray="8 4"
                          strokeLinecap="round"
                          opacity="0.9"
                        />
                        <line
                          x1="150" y1="15" x2="150" y2="385"
                          stroke="rgba(255,255,255,0.25)"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1="15" y1="155" x2="285" y2="155"
                          stroke="rgba(255,255,255,0.35)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="20" y="150"
                          fill="rgba(255,255,255,0.45)"
                          fontSize="6.5"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          letterSpacing="0.05em"
                        >
                          ĐƯỜNG MẮT / EYE LINE
                        </text>
                        <path d="M 15 35 L 15 15 L 35 15" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 285 35 L 285 15 L 265 15" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 15 365 L 15 385 L 35 385" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 285 365 L 285 385 L 265 385" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                  
                  <div className="pink-camera-top-bar">
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <div className="pink-camera-counter" aria-live="polite">
                        <Images className="size-4" />
                        <strong>{capturedPhotos.length}/{maxGuestPhotos}</strong>
                        <span className="hidden sm:inline">ảnh đã chụp</span>
                      </div>

                      {cameraStream && !isCameraReconnecting && (
                        <div className="pink-camera-live-indicator">
                          <span className="live-dot" />
                          <span>LIVE</span>
                        </div>
                      )}
                    </div>
                    
                    {cameraDevices.length > 0 && boothMode !== 'id_photo' && (
                      <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="pink-camera-select-wrapper">
                          <Camera className="size-4 text-pink-600 shrink-0" />
                          <select
                            value={selectedCameraId}
                            onChange={(e) => handleCameraChange(e.target.value)}
                            className="pink-camera-select"
                            aria-label="Select camera"
                            title="Chọn Camera / Máy ảnh"
                            disabled={isLockedCaptureRunning || isCapturingGuestPhoto}
                          >
                            {cameraDevices.map((device) => (
                              <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {IS_DSLR_MODE_ENABLED && (
                          <>
                            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-pink-600 border border-pink-200 hover:border-pink-400 shadow-sm hover:text-pink-700 transition-all text-xs font-bold shrink-0 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={useDslrTrigger}
                                onChange={(e) => {
                                  setUseDslrTrigger(e.target.checked);
                                  localStorage.setItem('useDslrTrigger', e.target.checked ? 'true' : 'false');
                                }}
                                disabled={isLockedCaptureRunning || isCapturingGuestPhoto}
                                className="accent-pink-600 cursor-pointer size-3.5"
                              />
                              DSLR (digiCam)
                            </label>
                            
                            <button
                              type="button"
                              onClick={() => setShowDslrGuide(!showDslrGuide)}
                              className="flex items-center justify-center size-8 rounded-full bg-white/95 text-pink-600 border border-pink-200 shadow-sm hover:border-pink-500 hover:text-pink-700 transition-all font-bold text-xs shrink-0 cursor-pointer"
                              title="Hướng dẫn kết nối Canon M50 / DSLR"
                            >
                              ?
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {isCameraReconnecting && !isUsingFallbackCameraRef.current && (
                    <div className="pink-reconnect-overlay">
                      <div className="pink-reconnect-spinner">
                        <Loader2 className="size-10 animate-spin text-pink-500" />
                      </div>
                      <h3>Mất kết nối camera</h3>
                      <p>Đang tự động kết nối lại máy ảnh/camera của bạn…</p>
                      <span className="text-xs opacity-60 mt-1">Vui lòng kiểm tra cổng USB/nguồn thiết bị</span>
                    </div>
                  )}

                  {isCameraReconnecting && isUsingFallbackCameraRef.current && (
                    <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-amber-500/90 text-white text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-2 shadow-lg backdrop-blur z-20 animate-pulse border border-amber-300 pointer-events-none select-none">
                      <span className="size-2 rounded-full bg-white animate-ping" />
                      <span>⚠️ Đang chạy camera dự phòng. Cắm lại Canon M50 / Dây Capture để tự động nhận dạng lại…</span>
                    </div>
                  )}

                  {showDslrGuide && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 p-5 rounded-2xl flex flex-col justify-between text-pink-900 overflow-y-auto animate-fade-in">
                      <div>
                        <div className="flex justify-between items-center border-b border-pink-100 pb-2 mb-3">
                          <h3 className="font-semibold text-sm text-pink-700 flex items-center gap-2">
                            📸 Hướng Dẫn Kết Nối Canon M50 & DSLR
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowDslrGuide(false)}
                            className="size-6 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="space-y-3 text-xs text-left leading-relaxed">
                          <div>
                            <p className="font-bold text-pink-800 text-[11px] mb-1">Cách 1: Kết nối bằng dây Capture Card (Khuyên dùng - Ổn định nhất)</p>
                            <ul className="list-disc list-inside space-y-0.5 pl-1 text-pink-700">
                              <li>Cắm cáp **Micro-HDMI** từ Canon M50 vào cổng HDMI của **Capture Card**.</li>
                              <li>Cắm đầu USB của Capture Card vào máy tính.</li>
                              <li>Ở danh sách camera phía trên, chọn thiết bị tên là **USB Video** hoặc **HDMI Video**.</li>
                            </ul>
                          </div>
                          
                          <div>
                            <p className="font-bold text-pink-800 text-[11px] mb-1">Cách 2: Cắm dây USB trực tiếp (Sử dụng EOS Webcam Utility)</p>
                            <ul className="list-disc list-inside space-y-0.5 pl-1 text-pink-700">
                              <li>Cắm cáp USB trực tiếp từ máy ảnh Canon M50 vào cổng USB máy tính.</li>
                              <li>Tải và cài đặt driver miễn phí **Canon EOS Webcam Utility** từ trang chủ Canon.</li>
                              <li>Chọn thiết bị camera là **EOS Webcam Utility** trong danh sách phía trên.</li>
                            </ul>
                          </div>
                          
                          <div className="bg-pink-50/70 p-2 rounded-xl border border-pink-100">
                            <p className="font-bold text-pink-800 mb-0.5">⚠️ Cài đặt quan trọng trên máy ảnh:</p>
                            <ol className="list-decimal list-inside space-y-0.5 pl-1 text-pink-700 font-medium">
                              <li>Xoay bánh răng chế độ trên máy ảnh sang **Movie Mode (Quay Phim)**.</li>
                              <li>Vào Menu &rarr; Cài đặt &rarr; **Tắt tự động tắt nguồn (Disable Auto Power Off)**.</li>
                              <li>Khuyên dùng pin giả (Dummy Battery) cắm nguồn trực tiếp để chạy cả ngày.</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowDslrGuide(false)}
                        className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
                      >
                        Đã Hiểu, Đóng Hướng Dẫn
                      </button>
                    </div>
                  )}

                  {captureCountdown && (
                    <div
                      key={captureCountdown}
                      className={`pink-countdown ${isNaN(Number(captureCountdown)) ? 'is-emoji' : ''}`}
                    >
                      {captureCountdown === '📸' || captureCountdown === '??' ? (
                        <Camera className="size-12 text-[#ff2f93] animate-pulse" />
                      ) : (
                        captureCountdown
                      )}
                    </div>
                  )}
                  {flashActive && <div className="pink-flash" />}
                  {!cameraStream && !isCameraReconnecting && (
                    <div className="pink-camera-off">
                      <VideoOff className="size-10 text-pink-300 mb-2" />
                      <p className="font-bold text-pink-800 text-sm">
                        {cameraError || 'Chưa bật camera'}
                      </p>
                      <button type="button" onClick={startGuestJourney} className="pink-outline-btn mt-3">
                        Bật camera
                      </button>
                    </div>
                  )}
                  {boothMode !== 'id_photo' && (
                    <div className="pink-shutter-overlay">
                      <div className="flex items-center justify-center gap-3 pointer-events-auto">
                        {capturedPhotos.length > 0 && !isLockedCaptureRunning && (
                          <button
                            type="button"
                            onClick={handleClearAndRetake}
                            className="px-4 py-2.5 bg-white/95 text-pink-600 hover:text-pink-800 border border-pink-200 hover:border-pink-400 rounded-full font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            title="Xóa hết ảnh đã chụp để chụp lại từ đầu"
                          >
                            <RefreshCcw className="size-3.5 animate-spin-slow" /> Chụp lại
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={startGuestCaptureSession}
                          disabled={!cameraStream || isLockedCaptureRunning || isCapturingGuestPhoto || capturedPhotos.length >= maxGuestPhotos}
                          className={`pink-shutter ${isLockedCaptureRunning ? 'locked' : ''} hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer`}
                          aria-label="Start automatic capture"
                          title="Bắt đầu chụp tự động"
                        >
                          <span />
                        </button>
                      </div>
                      
                      <p className="pink-shutter-hint">
                        {!cameraStream
                          ? 'Camera đang kết nối, đợi màn hình hiện rõ rồi bấm chụp nha.'
                          : capturedPhotos.length >= maxGuestPhotos
                            ? `Đã đủ ${maxGuestPhotos} tấm rồi, qua chọn khung nha.`
                            : capturedPhotos.length >= minGuestPhotosToContinue
                              ? `Đã có ${capturedPhotos.length} tấm rồi, bạn có thể dừng tại đây hoặc chụp thêm.`
                              : isLockedCaptureRunning
                                ? `Máy tự chụp sau ${nextCaptureSecondsLeft}s. Bạn cứ tạo dáng thật thoải mái.`
                                : 'Bấm nút chụp để bắt đầu đếm giờ.'}
                      </p>
                    </div>
                  )}
                </div>

                {boothMode === 'photobooth' && (
                  <div className="flex flex-col items-center gap-3 mt-4 mb-3 pointer-events-auto w-full">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-black text-pink-700 mb-1">
                      <Sparkles className="size-4 sm:size-5" /> Chọn bộ lọc:
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {BEAUTY_FILTER_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`pink-filter-preset ${activeBeautyPresetId === preset.id ? 'active' : ''} cursor-pointer !text-sm sm:!text-base !py-2.5 sm:!py-3 !px-5 sm:!px-7 !font-black shadow-md hover:scale-105 active:scale-95 transition-transform`}
                          onClick={() => applyBeautyPreset(preset)}
                          disabled={isCapturingGuestPhoto}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {boothMode === 'id_photo' && (
                  <div className="p-4 bg-white/90 border border-pink-100 rounded-3xl shadow-lg flex flex-col items-center gap-3 w-full">
                    {cameraDevices.length > 0 && (
                      <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="pink-camera-select-wrapper">
                          <Camera className="size-4 text-pink-600 shrink-0" />
                          <select
                            value={selectedCameraId}
                            onChange={(e) => handleCameraChange(e.target.value)}
                            className="pink-camera-select"
                            aria-label="Select camera"
                            title="Chọn Camera / Máy ảnh"
                            disabled={isLockedCaptureRunning || isCapturingGuestPhoto}
                          >
                            {cameraDevices.map((device) => (
                              <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {IS_DSLR_MODE_ENABLED && (
                          <>
                            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-pink-600 border border-pink-200 hover:border-pink-400 shadow-sm hover:text-pink-700 transition-all text-xs font-bold shrink-0 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={useDslrTrigger}
                                onChange={(e) => {
                                  setUseDslrTrigger(e.target.checked);
                                  localStorage.setItem('useDslrTrigger', e.target.checked ? 'true' : 'false');
                                }}
                                disabled={isLockedCaptureRunning || isCapturingGuestPhoto}
                                className="accent-pink-600 cursor-pointer size-3.5"
                              />
                              DSLR (digiCam)
                            </label>
                            
                            <button
                              type="button"
                              onClick={() => setShowDslrGuide(!showDslrGuide)}
                              className="flex items-center justify-center size-8 rounded-full bg-white/95 text-pink-600 border border-pink-200 shadow-sm hover:border-pink-500 hover:text-pink-700 transition-all font-bold text-xs shrink-0 cursor-pointer"
                              title="Hướng dẫn kết nối Canon M50 / DSLR"
                            >
                              ?
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3 pointer-events-auto">
                      {capturedPhotos.length > 0 && !isLockedCaptureRunning && (
                        <button
                          type="button"
                          onClick={handleClearAndRetake}
                          className="px-4 py-2 bg-white/95 text-pink-600 hover:text-pink-800 border border-pink-200 hover:border-pink-400 rounded-full font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                          title="Xóa hết ảnh đã chụp để chụp lại từ đầu"
                        >
                          <RefreshCcw className="size-3.5" /> Chụp lại
                        </button>
                      )}

                      {canFinishCaptureEarly && (
                        <button
                          type="button"
                          onClick={requestFinishCaptureEarly}
                          className="pink-shutter-stop-btn hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                          title="Dừng chụp sớm và chuyển qua bước tiếp theo"
                        >
                          <ArrowRight className="size-3.5" /> Dừng chụp
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={startGuestCaptureSession}
                        disabled={!cameraStream || isLockedCaptureRunning || isCapturingGuestPhoto || capturedPhotos.length >= maxGuestPhotos}
                        className={`pink-shutter ${isLockedCaptureRunning ? 'locked' : ''} hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer`}
                        aria-label="Start automatic capture"
                        title="Bắt đầu chụp tự động"
                      >
                        <span />
                      </button>
                    </div>
                    
                    <p className="text-center text-[10px] font-bold text-pink-700 max-w-md m-0">
                      {!cameraStream
                        ? 'Camera đang kết nối, đợi màn hình hiện rõ rồi bấm chụp nha.'
                        : capturedPhotos.length >= maxGuestPhotos
                          ? `Đã đủ ${maxGuestPhotos} tấm rồi, qua chọn ảnh nha.`
                          : capturedPhotos.length >= minGuestPhotosToContinue
                            ? `Đã có ${capturedPhotos.length} tấm rồi, bạn có thể dừng chụp tại đây hoặc chụp tiếp.`
                            : isLockedCaptureRunning
                              ? `Máy tự chụp sau ${nextCaptureSecondsLeft}s. Bạn cứ tạo dáng thật thoải mái.`
                              : `Bấm nút chụp để bắt đầu đếm ngược tự động chụp ${maxGuestPhotos} tấm.`}
                    </p>
                  </div>
                )}

                {canFinishCaptureEarly && boothMode !== 'id_photo' && (
                  <div className="p-3 bg-pink-50 border border-pink-100 rounded-2xl flex items-center justify-between gap-4 w-full">
                    <p className="text-xs text-[#74194a] font-bold m-0">Đã có {capturedPhotos.length} tấm rồi, bạn có thể dừng chụp và chọn khung luôn.</p>
                    <button type="button" onClick={requestFinishCaptureEarly} className="pink-btn shrink-0 text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer">
                      <ArrowRight className="size-4" /> Dừng chụp
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
          </section>
    </div>
  );
}
