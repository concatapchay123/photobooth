const fs = require('fs');
const file = 'src/App.jsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const startLine = 8994 - 1; // 0-indexed
const endLine = 9155; 

const replacement = `      <GuestResultScreen
        isResultUnlocked={isResultUnlocked}
        boothMode={boothMode}
        guestShare={guestShare}
        isGeneratingGuestResult={isGeneratingGuestResult}
        guestPreviewUrl={guestPreviewUrl}
        guestShareExpiryText={guestShareExpiryText}
        guestQrUrl={guestQrUrl}
        copyGuestShareLink={copyGuestShareLink}
        isCopiedShareLink={isCopiedShareLink}
        guestNotice={guestNotice}
        guestPrintStatus={guestPrintStatus}
        guestPrintFallbackAvailable={guestPrintFallbackAvailable}
        printGuestPhoto={printGuestPhoto}
        isGuestPrinting={isGuestPrinting}
        openGuestBrowserPrintFallback={openGuestBrowserPrintFallback}
        guestNewSessionCountdown={guestNewSessionCountdown}
      />`;

lines.splice(startLine, endLine - startLine, replacement);
fs.writeFileSync(file, lines.join('\n'));
console.log('ResultScreen replaced!');
