import React, { useState, useEffect, useRef } from 'react';

export default function DocumentScanner({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [capturedFile, setCapturedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (deviceId) => {
    setError(null);
    setLoading(true);
    stopCamera();

    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission('granted');

      // Now that stream has started, we have permission, so labels are accessible
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameras(videoDevices);

      // Select active camera device in state
      if (!deviceId && videoDevices.length > 0) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeLabel = activeTrack?.label;
        const matchingDevice = videoDevices.find((d) => d.label === activeLabel);
        setSelectedCameraId(matchingDevice ? matchingDevice.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraPermission('denied');
        setError('Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.');
      } else {
        setError('Tidak dapat membuka kamera. Pastikan kamera terhubung dan tidak sedang digunakan oleh aplikasi lain.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start default camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Handle camera device change
  const handleCameraChange = (e) => {
    const deviceId = e.target.value;
    setSelectedCameraId(deviceId);
    startCamera(deviceId);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw image
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const file = new File([blob], `scan_${timestamp}.jpg`, { type: 'image/jpeg' });
            setCapturedFile(file);
            
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            
            // Stop camera while viewing preview to save resource
            stopCamera();
          }
        },
        'image/jpeg',
        0.95
      );
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedFile(null);
    startCamera(selectedCameraId);
  };

  const handleUseDocument = () => {
    if (capturedFile) {
      onCapture(capturedFile);
    }
  };

  const handleCancelClick = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    stopCamera();
    onCancel();
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row min-h-[500px]">
      
      {/* Left panel / Camera View Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-4 min-h-[350px] md:min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-3" />
            <p className="text-sm text-slate-300">Menghubungkan ke kamera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 z-20">
            <div className="w-16 h-16 rounded-full bg-red-950/50 flex items-center justify-center text-red-500 mb-4 border border-red-900/30">
              <i className="bi bi-camera-video-off text-3xl" />
            </div>
            <h4 className="text-lg font-semibold text-red-400 mb-2">Akses Kamera Gagal</h4>
            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => startCamera(selectedCameraId)}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl text-sm font-semibold transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Video feed / Captured preview display */}
        {!error && (
          <div className="relative w-full max-w-2xl aspect-[4/3] rounded-xl overflow-hidden shadow-inner border border-slate-800 bg-slate-950 flex items-center justify-center">
            
            {/* Show static image if captured */}
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Captured document snapshot"
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Guidelines overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-12">
                  <div className="w-full h-full border-2 border-dashed border-purple-400/40 rounded-lg relative">
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br" />
                    
                    {/* Helper text overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                      <p className="text-[10px] sm:text-xs text-purple-300 font-medium tracking-wide whitespace-nowrap">
                        Posisikan dokumen di dalam bingkai
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right panel / Controls area */}
      <div className="w-full md:w-[280px] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between">
        
        {/* Top Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="bi bi-camera-fill text-purple-400" />
              Pindai Dokumen
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Pindai dokumen fisik dengan webcam atau kamera HP Anda untuk langsung menambahkan surat.
            </p>
          </div>

          {/* Camera Selection Dropdown */}
          {!previewUrl && cameras.length > 1 && (
            <div className="space-y-1.5 pt-2">
              <label htmlFor="cameraSelect" className="block text-xs font-semibold text-slate-400">
                Pilih Kamera
              </label>
              <div className="relative">
                <select
                  id="cameraSelect"
                  value={selectedCameraId}
                  onChange={handleCameraChange}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                >
                  {cameras.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Kamera ${cameras.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Capture Action Area */}
        <div className="py-6 md:py-0 flex flex-col gap-3">
          {previewUrl ? (
            // Preview Action Buttons
            <>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 mb-2">
                <p className="text-xs text-slate-400 font-semibold mb-1">Preview Berhasil</p>
                <p className="text-[10px] text-slate-500 break-all">{capturedFile?.name}</p>
                <p className="text-[10px] text-emerald-400 font-medium mt-1">
                  Ukuran: {(capturedFile?.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={handleUseDocument}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-750 to-pink-650 hover:from-purple-650 hover:to-pink-550 text-white text-sm font-semibold shadow-lg shadow-purple-950/20 hover:shadow-purple-900/30 transition min-h-[44px]"
                style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
              >
                <i className="bi bi-file-earmark-check-fill text-lg" />
                Gunakan Dokumen
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold border border-slate-700 transition min-h-[44px]"
              >
                <i className="bi bi-arrow-repeat text-lg" />
                Foto Ulang
              </button>
            </>
          ) : (
            // Live Stream Action Buttons
            <>
              <button
                type="button"
                onClick={handleCapture}
                disabled={loading || error || cameraPermission !== 'granted'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-sm font-semibold shadow-lg shadow-purple-950/30 hover:shadow-purple-900/40 transition duration-200 cursor-pointer min-h-[48px]"
                style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
              >
                <i className="bi bi-camera-fill text-lg" />
                Ambil Foto
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleCancelClick}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white text-sm font-semibold transition min-h-[44px]"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
