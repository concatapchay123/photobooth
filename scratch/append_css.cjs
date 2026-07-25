const fs = require('fs');

const overrides = `
/* ==========================================
   PREMIUM REDESIGNED UI/UX (GSAP & GLASSMORPHISM)
   ========================================== */

/* Modern Neon & Glassmorphic Custom Properties */
:root {
  --pink-primary: #ff4b91 !important;
  --pink-primary-rgb: 255, 75, 145 !important;
  --pink-secondary: #ff7eb3 !important;
  --pink-dark: #3b001a !important;
  --pink-light: #fff0f6 !important;
  --pink-muted: #9b728b !important;
  --glass-bg: rgba(255, 255, 255, 0.72) !important;
  --glass-border: rgba(255, 255, 255, 0.65) !important;
  --glass-shadow: 0 20px 40px -12px rgba(255, 75, 145, 0.09) !important;
}

/* Base App overrides */
.pink-pop-app {
  background: linear-gradient(135deg, #fff2f7 0%, #fffbfd 40%, #f6e6ff 100%) !important;
  font-family: 'Nunito', sans-serif !important;
  -webkit-font-smoothing: antialiased;
}

/* Glassmorphic Stepper Header */
.pink-stepper-header {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 84px !important;
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5) !important;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02) !important;
  z-index: 1000 !important;
  display: flex !important;
  align-items: center !important;
}

.pink-stepper-container {
  width: 100% !important;
  max-width: 1200px !important;
  margin: 0 auto !important;
  padding: 0 2rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.pink-stepper-step {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  position: relative !important;
}

.pink-stepper-node {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

/* Step Node States */
.pink-stepper-node.inactive {
  background: #f1f3f5 !important;
  color: #adb5bd !important;
  border: 2px solid #e9ecef !important;
}

.pink-stepper-node.active {
  background: var(--pink-primary) !important;
  color: white !important;
  box-shadow: 0 0 0 5px rgba(255, 75, 145, 0.25), 0 8px 20px rgba(255, 75, 145, 0.3) !important;
  transform: scale(1.1) !important;
}

.pink-stepper-node.completed {
  background: #20c997 !important;
  color: white !important;
  box-shadow: 0 8px 16px rgba(32, 201, 151, 0.2) !important;
}

.pink-stepper-label {
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  letter-spacing: -0.01em !important;
  transition: color 0.3s ease !important;
}

.pink-stepper-label.inactive {
  color: #adb5bd !important;
}

.pink-stepper-label.active {
  color: var(--pink-dark) !important;
}

.pink-stepper-label.completed {
  color: #20c997 !important;
}

.pink-stepper-line {
  flex-grow: 1 !important;
  height: 6px !important;
  background: #f1f3f5 !important;
  margin: 0 1.5rem !important;
  border-radius: 99px !important;
  overflow: hidden !important;
  position: relative !important;
}

.pink-stepper-line-progress {
  height: 100% !important;
  background: linear-gradient(90deg, var(--pink-primary) 0%, var(--pink-secondary) 100%) !important;
  border-radius: 99px !important;
  width: 0%;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1) !important;
}

/* Glassmorphic card design */
.pink-card {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 28px !important;
  box-shadow: var(--glass-shadow) !important;
  padding: 2rem !important;
  transition: all 0.3s ease !important;
}

/* Premium Buttons overrides */
.pink-btn {
  background: linear-gradient(135deg, var(--pink-primary) 0%, #ff62aa 100%) !important;
  color: white !important;
  border: none !important;
  border-radius: 99px !important;
  font-weight: 800 !important;
  font-size: 1rem !important;
  letter-spacing: 0.02em !important;
  height: 52px !important;
  padding: 0 2.2rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.6rem !important;
  box-shadow: 0 10px 24px rgba(255, 75, 145, 0.22) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
  cursor: pointer !important;
  text-transform: uppercase !important;
  outline: none !important;
}

.pink-btn:hover:not(:disabled) {
  transform: translateY(-3px) !important;
  box-shadow: 0 15px 32px rgba(255, 75, 145, 0.32) !important;
}

.pink-btn:active:not(:disabled) {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 18px rgba(255, 75, 145, 0.22) !important;
}

.pink-btn:disabled {
  background: #f1f3f5 !important;
  color: #adb5bd !important;
  box-shadow: none !important;
  border: 1px solid #dee2e6 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

.pink-outline-btn {
  background: white !important;
  color: var(--pink-dark) !important;
  border: 2px solid rgba(255, 75, 145, 0.15) !important;
  border-radius: 99px !important;
  font-weight: 800 !important;
  font-size: 1rem !important;
  height: 52px !important;
  padding: 0 2rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.6rem !important;
  transition: all 0.3s ease !important;
  cursor: pointer !important;
}

.pink-outline-btn:hover:not(:disabled) {
  background: var(--pink-light) !important;
  border-color: var(--pink-primary) !important;
  color: var(--pink-primary) !important;
  transform: translateY(-2px) !important;
}

/* Section dot removed */
.pink-step-dot {
  display: none !important;
}

/* Headlines styling */
.pink-step-headline {
  font-size: 1.8rem !important;
  color: var(--pink-dark) !important;
  font-weight: 900 !important;
  letter-spacing: -0.02em !important;
  margin-bottom: 0.5rem !important;
}

/* Adjust step adjustments */
#guest-adjust .pink-adjust-stage {
  background: rgba(255, 255, 255, 0.45) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  border-radius: 24px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.01) !important;
}

.pink-adjust-stage-head {
  background: white !important;
  border-bottom: 1px solid rgba(255, 75, 145, 0.08) !important;
  padding: 0.8rem 1.2rem !important;
  border-radius: 20px 20px 0 0 !important;
}

.pink-adjust-panel {
  background: rgba(255, 255, 255, 0.65) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.7) !important;
  border-radius: 24px !important;
  box-shadow: 0 10px 30px rgba(255, 75, 145, 0.03) !important;
}

/* Welcome screen floating stickers improvements */
.korean-vibe-sticker {
  font-family: sans-serif;
  filter: drop-shadow(0 4px 10px rgba(255, 75, 145, 0.15)) !important;
  animation: float-sticker 4s ease-in-out infinite alternate !important;
}

@keyframes float-sticker {
  0% { transform: translateY(0) rotate(0); }
  100% { transform: translateY(-8px) rotate(5deg); }
}

/* Override background transition track to none, we use GSAP */
.guest-slider-track {
  transition: none !important;
}

/* Fix step positioning for fixed stepper */
.guest-slider-track section.pink-step {
  padding-top: 104px !important; /* Space for the 84px header + padding */
}
`;

fs.appendFileSync('src/styles.css', overrides);
console.log("Appended overrides to src/styles.css successfully!");
