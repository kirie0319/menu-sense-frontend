'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, AlertTriangle, Brain, Zap } from 'lucide-react';
import { useTranslationStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import ServerStatus from './ServerStatus';
import CameraCapture from './CameraCapture';

const HomePage = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const { selectedFile, setFile } = useTranslationStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setFile(file);
    }
  }, [setFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleCameraCapture = useCallback((file: File) => {
    handleFileUpload(file);
    setIsCameraOpen(false);
  }, [handleFileUpload]);

  const openCamera = () => {
    setIsCameraOpen(true);
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
  };

  const handleStartAnalysis = () => {
    if (!selectedFile || !isServerHealthy) return;
    // プロセス画面に遷移
    router.push('/process');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* デスクトップレイアウト */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🍽️</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                MenuSense
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">✨ Free to try</span>
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
              <ServerStatus onStatusChange={setIsServerHealthy} />
            </div>
          </div>

          {/* モバイルレイアウト */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🍽️</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  MenuSense
                </h1>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
                <span className="text-xs text-gray-500">✨ Free</span>
              </div>
              <div className="scale-75 origin-right">
                <ServerStatus onStatusChange={setIsServerHealthy} />
              </div>
            </div>
          </div>

          {/* タブレットレイアウト */}
          <div className="hidden sm:flex md:hidden items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🍽️</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                MenuSense
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
              <ServerStatus onStatusChange={setIsServerHealthy} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <span>🎌</span>
            <span className="hidden sm:inline">Perfect for travelers in Japan</span>
            <span className="sm:hidden">For Japan travelers</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight px-2">
            Finally understand{' '}
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Japanese menus
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            <span className="hidden sm:inline">
              Don&apos;t guess what you&apos;re ordering. Get instant, detailed explanations of every dish, 
              including ingredients, allergens, and spice levels—all in seconds.
            </span>
            <span className="sm:hidden">
              Get instant explanations of Japanese dishes with ingredients, allergens, and spice levels.
            </span>
          </p>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 px-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>🔥</span>
              <span className="hidden sm:inline">Trusted by 10k+ travelers</span>
              <span className="sm:hidden">10k+ users</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>⚡</span>
              <span className="hidden sm:inline">Works in 3 seconds</span>
              <span className="sm:hidden">3s fast</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>🛡️</span>
              <span className="hidden sm:inline">100% private & secure</span>
              <span className="sm:hidden">Private</span>
            </div>
          </div>
        </motion.div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Try it now with your menu photo
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Upload any Japanese menu and see the magic happen ✨
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`relative bg-gradient-to-br from-orange-50 to-yellow-50 p-6 sm:p-8 md:p-12 text-center cursor-pointer rounded-lg sm:rounded-xl border-2 border-dashed transition-all duration-300 ${
              isDragOver 
                ? 'border-orange-500 bg-gradient-to-br from-orange-100 to-red-100 scale-105' 
                : 'border-orange-300 hover:border-orange-400 hover:bg-gradient-to-br hover:from-orange-100 hover:to-yellow-100'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            {selectedFile ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto">
                  ✅
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Menu uploaded successfully!
                </h3>
                <p className="text-sm sm:text-base text-gray-600 truncate px-4">
                  File: {selectedFile.name}
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-orange-600 hover:text-orange-800 font-medium text-sm sm:text-base"
                  >
                    Upload another menu
                  </button>
                  <motion.button
                    whileHover={isServerHealthy ? { scale: 1.05 } : {}}
                    whileTap={isServerHealthy ? { scale: 0.95 } : {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAnalysis();
                    }}
                    disabled={!isServerHealthy}
                    className={`px-4 sm:px-6 py-2 font-semibold rounded-lg transition-all duration-300 text-sm sm:text-base ${
                      isServerHealthy
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Camera className="inline-block h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">
                      {isServerHealthy ? 'Start Analysis' : 'Backend Required'}
                    </span>
                    <span className="sm:hidden">
                      {isServerHealthy ? 'Analyze' : 'Backend Required'}
                    </span>
                  </motion.button>
                </div>
                {!isServerHealthy && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-2 px-2">
                    Please ensure the backend server is running to enable translation.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="animate-bounce">
                  <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto" />
                </div>
                
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  <span className="hidden sm:inline">Drop your menu photo here</span>
                  <span className="sm:hidden">Upload menu photo</span>
                </h3>
                
                <p className="text-sm sm:text-base text-gray-600">
                  <span className="hidden sm:inline">Or choose an option below</span>
                  <span className="sm:hidden">Choose an option</span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openCamera();
                    }}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-green-600 hover:to-emerald-600 text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Take Photo</span>
                    <span className="sm:hidden">Camera</span>
                  </button>
                  
                  <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-orange-600 hover:to-red-600 text-sm sm:text-base flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Choose from Gallery</span>
                    <span className="sm:hidden">Gallery</span>
                  </button>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-500 px-2">
                  <span className="hidden sm:inline">JPG, PNG, or GIF up to 10MB • Completely free to try</span>
                  <span className="sm:hidden">JPG, PNG, GIF up to 10MB • Free</span>
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </motion.div>

          {/* Example Results Preview */}
          {!selectedFile && (
            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg sm:rounded-xl border border-orange-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 text-center">
                ✨ Here&apos;s what you&apos;ll get instantly:
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">Original: 焼き鳥 ¥300</div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Yakitori - Grilled Chicken Skewers</div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                    <span className="hidden sm:inline">
                      Tender chicken pieces grilled on bamboo skewers with sweet soy-based tare sauce. 
                      A popular Japanese pub food.
                    </span>
                    <span className="sm:hidden">
                      Grilled chicken skewers with sweet soy sauce.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Contains: Soy, Gluten</span>
                      <span className="sm:hidden">Soy, Gluten</span>
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      🌶️ Mild
                    </span>
                  </div>
                </div>
                
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">Original: 海老フライ ¥450</div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Ebi Fry - Breaded Fried Shrimp</div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                    <span className="hidden sm:inline">
                      Large prawns coated in panko breadcrumbs and deep-fried until golden. 
                      Served with tartar sauce.
                    </span>
                    <span className="sm:hidden">
                      Panko-breaded fried prawns with tartar sauce.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Contains: Shellfish, Gluten</span>
                      <span className="sm:hidden">Shellfish, Gluten</span>
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      🌶️ None
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Beyond Google Translate</h3>
            <p className="text-gray-600 text-sm">
              Get context, cooking methods, and cultural background—not just word-for-word translation.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Allergy Safety First</h3>
            <p className="text-gray-600 text-sm">
              Automatically detect allergens and ingredients that might be hidden in traditional dishes.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Instant Results</h3>
            <p className="text-gray-600 text-sm">
              No more spending 10 minutes googling each dish. Get everything you need in seconds.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        {!selectedFile && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Ready to never worry about Japanese menus again?</h2>
            <p className="text-blue-100 mb-6">Join thousands of travelers who dine with confidence in Japan</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={openCamera}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 mx-auto sm:mx-0"
              >
                <Camera className="w-5 h-5" />
                Take Photo Now
              </button>
              <button 
                onClick={handleFileSelect}
                className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 mx-auto sm:mx-0"
              >
                <Upload className="w-5 h-5" />
                Upload from Gallery
              </button>
            </div>
            <p className="text-sm text-blue-200 mt-3">Completely free • No signup required • Works instantly</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              Powered by Google Vision API, Google Translate API, and OpenAI GPT-4 • Built with Next.js and Tailwind CSS
            </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={closeCamera}
      />
    </div>
  );
};

export default HomePage; 