'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { CameraCaptureProps } from '@/types/components';

const CameraCapture = ({ onCapture, onClose, isOpen }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // カメラストリームを開始
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 既存のストリームを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // カメラアクセスを要求
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('カメラにアクセスできません。カメラの使用を許可してください。');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  // カメラストリームを停止
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // カメラ切り替え（フロント/リア）
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // 写真を撮影
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // キャンバスサイズをビデオサイズに設定
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 画像データを取得
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  // 撮影した写真を確定
  const confirmCapture = useCallback(() => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `menu-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        onCapture(file);
        setCapturedImage(null);
        stopCamera();
        onClose();
      }
    }, 'image/jpeg', 0.8);
  }, [onCapture, stopCamera, onClose]);

  // 撮影をやり直し
  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
  }, [capturedImage]);

  // モーダルが開かれた時にカメラを開始
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
        setCapturedImage(null);
      }
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, capturedImage]);

  // facingModeが変更された時にカメラを再起動
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
  }, [facingMode, isOpen, capturedImage, startCamera]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black"
      >
        {/* ヘッダー */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
            >
              <X size={24} />
            </button>
            <h2 className="text-lg font-semibold">メニューを撮影</h2>
            <button
              onClick={switchCamera}
              className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
              disabled={isLoading || !!capturedImage}
            >
              <RefreshCw size={24} />
            </button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="relative w-full h-full flex items-center justify-center">
          {error ? (
            <div className="text-center p-6">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-white text-lg mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold"
              >
                再試行
              </button>
            </div>
          ) : capturedImage ? (
            // 撮影した写真のプレビュー
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured menu"
                className="w-full h-full object-contain"
              />
              
              {/* 撮影確認ボタン */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={retakePhoto}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold flex items-center space-x-2"
                  >
                    <RefreshCw size={20} />
                    <span>撮り直し</span>
                  </button>
                  <button
                    onClick={confirmCapture}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold flex items-center space-x-2"
                  >
                    <Check size={20} />
                    <span>この写真を使用</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // カメラビュー
            <div className="relative w-full h-full">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white">カメラを起動中...</p>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 撮影ガイド */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-white/50 border-dashed rounded-lg"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
                      <p className="text-sm bg-black/30 backdrop-blur-sm px-3 py-1 rounded">
                        メニュー表をフレーム内に収めてください
                      </p>
                    </div>
                  </div>
                  
                  {/* 撮影ボタン */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Camera size={32} className="text-gray-700" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 隠しキャンバス（撮影用） */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default CameraCapture; 