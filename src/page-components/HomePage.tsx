'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, AlertTriangle, Brain, Zap } from 'lucide-react';
// import { useTranslationStore } from '@/lib/store'; // REMOVED: State management
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CameraCapture from '@/components/CameraCapture';
import StartAnalysisButton from '@/components/StartAnalysisButton';
import { Card, CardHeader, CardContent, Grid, MenuCard } from '@/components/ui';
import { processMenuImage } from '@/features/menu/api/menuProcessingApi';

const HomePage = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // LOCAL STATE
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // const { selectedFile, setFile } = useTranslationStore(); // REMOVED

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
      setSelectedFile(file); // USE LOCAL STATE
    }
  }, []);

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
    
    console.log('[HomePage] 🚀 Starting analysis preparation with file:', selectedFile.name);
    
    // ファイルをlocalStorageに保存（Base64エンコード）
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          data: reader.result as string // Base64文字列
        };
        
        localStorage.setItem('uploadedFile', JSON.stringify(fileData));
        console.log('[HomePage] 📁 File saved to localStorage:', {
          name: fileData.name,
          type: fileData.type,
          size: fileData.size,
          dataLength: fileData.data.length
        });
        
        // MenuPageに直接遷移（処理はMenuPageで開始）
        router.push('/menu');
        
      } catch (error) {
        console.error('[HomePage] ❌ Failed to save file to localStorage:', error);
      }
    };
    
    reader.onerror = () => {
      console.error('[HomePage] ❌ Failed to read file');
    };
    
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <Header onServerStatusChange={setIsServerHealthy} />
      
      {/* Header spacer */}
      <div className="h-16 sm:h-20 md:h-24"></div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12 mt-8 sm:mt-12 md:mt-16"
        >

          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight px-2">
            Safe meals,{' '}
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              more joy.
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            <span className="hidden sm:inline">
              Don&apos;t guess what you&apos;re ordering. Get instant, detailed explanations of every dish, 
              including ingredients, allergens, and spice levels—all in seconds.
            </span>
            <span className="sm:hidden">
              Get instant explanations of dishes with ingredients, allergens, and spice levels.
            </span>
          </p>

          {/* Social Proof */}

        </motion.div>

        {/* Upload Section */}
        <Card variant="elevated" className="mb-6 sm:mb-8">
          <CardHeader>
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                Try it now with your menu photo
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Upload any menu and see the magic happen ✨
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Upload Area */}
              <div
                className={`relative bg-white p-8 sm:p-12 text-center cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${
                  isDragOver 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-300 hover:border-orange-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileSelect}
              >
                <div className="space-y-4">
                  <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-orange-600 hover:to-red-600 text-base flex items-center justify-center gap-2 mx-auto">
                    <Upload className="w-4 h-4" />
                    <span>{selectedFile ? 'Change photos' : 'Try for Free'}</span>
                  </button>
                  
                  <p className="text-gray-600">
                    or <span className="text-orange-500 font-medium">drag and drop</span> your photos
                  </p>
                  
                  <p className="text-sm text-gray-500">
                    PNG, JPG, HEIC, WEBP up to 120MB
                  </p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Preview Area */}
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card variant="outline">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Uploaded photos</h3>
                        <button 
                          onClick={() => setSelectedFile(null)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <div className="flex items-center text-green-600">
                          <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">Uploaded</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>

            {/* Example Results Preview */}
            {!selectedFile && (
              <Card variant="ghost" className="mt-6 sm:mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                <CardHeader>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 text-center">
                    ✨ Here&apos;s what you&apos;ll get instantly:
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <MenuCard
                      item={{
                        id: 'preview-1',
                        name: '焼き鳥',
                        translation: 'Yakitori - Grilled Chicken Skewers',
                        price: '¥300',
                        category: 'メイン',
                        description: 'Tender chicken pieces grilled on bamboo skewers with sweet soy-based tare sauce.',
                        allergens: 'Contains: Soy, Gluten',
                        image_url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/74/2f/4e/caption.jpg?w=900&h=500&s=1',
                        image_urls: [
                          'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/74/2f/4e/caption.jpg?w=900&h=500&s=1',
                          'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/74/2f/4e/caption.jpg?w=900&h=500&s=1',
                          'https://kobe-rokko.jp/de/wp-content/uploads/sites/16/2020/01/2a3e44c5f69cdff53d1686f4665b497a.jpg'
                        ]
                      }}
                      onItemClick={() => {}}
                      onToggleFavorite={() => {}}
                      isFavorite={false}
                      showImages={true}
                      index={0}
                    />
                    
                    <MenuCard
                      item={{
                        id: 'preview-2',
                        name: '海老フライ',
                        translation: 'Ebi Fry - Breaded Fried Shrimp',
                        price: '¥450',
                        category: '前菜',
                        description: 'Large prawns coated in panko breadcrumbs and deep-fried until golden.',
                        allergens: 'Contains: Shellfish, Gluten',
                        image_url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/74/2f/4e/caption.jpg?w=900&h=500&s=1',
                        image_urls: [
                          'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1c/74/2f/4e/caption.jpg?w=900&h=500&s=1',
                          'https://kobe-rokko.jp/de/wp-content/uploads/sites/16/2020/01/2a3e44c5f69cdff53d1686f4665b497a.jpg',
                          'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3600818352177417555'
                        ]
                      }}
                      onItemClick={() => {}}
                      onToggleFavorite={() => {}}
                      isFavorite={false}
                      showImages={true}
                      index={1}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Value Props */}
        <Grid cols={3} gap="md" className="mb-8">
          <Card hoverable className="text-center">
            <CardContent>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Beyond Google Translate</h3>
              <p className="text-gray-600 text-sm">
                Get context, cooking methods, and cultural background—not just word-for-word translation.
              </p>
            </CardContent>
          </Card>

          <Card hoverable className="text-center">
            <CardContent>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Allergy Safety First</h3>
              <p className="text-gray-600 text-sm">
                Automatically detect allergens and ingredients that might be hidden in traditional dishes.
              </p>
            </CardContent>
          </Card>
          
          <Card hoverable className="text-center">
            <CardContent>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Results</h3>
              <p className="text-gray-600 text-sm">
                No more spending 10 minutes googling each dish. Get everything you need in seconds.
              </p>
            </CardContent>
          </Card>
        </Grid>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Start Analysis Button Component */}
      <StartAnalysisButton
        selectedFile={selectedFile}
        isServerHealthy={isServerHealthy}
        onStartAnalysis={handleStartAnalysis}
      />

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