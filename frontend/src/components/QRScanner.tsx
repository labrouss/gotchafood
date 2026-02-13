import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Use back camera on mobile
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanFrame();
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Unable to access camera. Please check permissions.');
      }
    };

    const scanFrame = () => {
      if (!scanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            // QR code detected!
            setScanning(false);
            onScan(code.data);
            
            // Stop camera
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    startCamera();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning, onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">📷 Scan Loyalty QR Code</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg px-3 py-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Overlay */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-white rounded-lg relative">
                {/* Animated corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg animate-pulse"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-6 text-center">
          {error ? (
            <div className="text-red-600 font-semibold">{error}</div>
          ) : scanning ? (
            <>
              <p className="text-gray-700 font-semibold mb-2">
                Position the QR code within the frame
              </p>
              <p className="text-sm text-gray-500">
                The camera will scan automatically
              </p>
            </>
          ) : (
            <div className="text-green-600 font-bold text-lg">
              ✓ QR Code Detected!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
