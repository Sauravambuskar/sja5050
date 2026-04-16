import { useState } from "react";
import { X } from "lucide-react";

const WHATSAPP_NUMBER = "919699346910";
const DEFAULT_MESSAGE = "Hello! I need help with SJA App, Could you please assist me?";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

export const WhatsAppFab = () => {
  const [dismissed, setDismissed] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {tooltipVisible && !dismissed && (
        <div className="relative flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-lg border border-gray-100 max-w-[210px]">
          <button
            onClick={() => setDismissed(true)}
            className="absolute -top-2 -right-2 rounded-full bg-gray-200 hover:bg-gray-300 p-0.5 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-800 leading-snug">
            Need help? Chat with us!
          </span>
        </div>
      )}

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        onMouseEnter={() => setTooltipVisible(true)}
        onClick={() => setDismissed(true)}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className="h-8 w-8 fill-white"
          aria-hidden="true"
        >
          <path d="M16.003 3C9.376 3 4 8.376 4 15.003c0 2.184.592 4.245 1.628 6.02L4 29l8.187-1.607A11.942 11.942 0 0 0 16.003 28c6.624 0 11.997-5.373 11.997-11.997C28 9.376 22.627 3 16.003 3zm0 21.87a9.817 9.817 0 0 1-5.014-1.376l-.36-.214-3.727.731.755-3.631-.236-.372A9.834 9.834 0 0 1 6.132 15c0-5.44 4.428-9.868 9.871-9.868 5.441 0 9.865 4.428 9.865 9.868 0 5.441-4.424 9.87-9.865 9.87zm5.41-7.386c-.296-.149-1.752-.864-2.024-.963-.271-.098-.469-.148-.667.149-.198.297-.766.963-.939 1.161-.173.197-.346.222-.642.074-.297-.148-1.252-.462-2.385-1.47-.882-.786-1.477-1.757-1.65-2.053-.174-.297-.019-.457.13-.605.133-.133.297-.346.445-.52.148-.172.197-.296.297-.494.099-.197.05-.371-.025-.52-.074-.148-.667-1.607-.914-2.202-.241-.579-.486-.5-.667-.51l-.568-.009c-.198 0-.52.074-.792.371-.271.297-1.038 1.015-1.038 2.474 0 1.459 1.062 2.868 1.21 3.066.149.197 2.09 3.191 5.065 4.476.708.307 1.261.49 1.691.627.711.226 1.357.194 1.868.118.57-.085 1.752-.716 1.999-1.408.247-.693.247-1.287.173-1.41-.074-.122-.271-.197-.568-.345z" />
        </svg>
      </a>
    </div>
  );
};
