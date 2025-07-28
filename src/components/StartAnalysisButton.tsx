'use client';

import { Camera } from 'lucide-react';
import { Button } from '@/components/ui';

interface StartAnalysisButtonProps {
  selectedFile: File | null;
  isServerHealthy: boolean;
  onStartAnalysis: () => void;
}

const StartAnalysisButton: React.FC<StartAnalysisButtonProps> = ({
  selectedFile,
  isServerHealthy,
  onStartAnalysis,
}) => {
  if (!selectedFile) return null;

  return (
    <>
      {/* Fixed Footer with Start Analyze Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 safe-area-pb z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-4">
          <Button
            onClick={onStartAnalysis}
            disabled={!isServerHealthy}
            variant={isServerHealthy ? 'primary' : 'secondary'}
            size="lg"
            className="w-full max-w-xs mx-auto block"
          >
            <Camera className="w-5 h-5" />
            <span>
              {isServerHealthy ? 'Start Analysis' : 'Backend Required'}
            </span>
          </Button>
          {!isServerHealthy && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Please ensure the backend server is running to enable translation.
            </p>
          )}
        </div>
      </div>

      {/* Add bottom padding when footer is visible */}
      <div className="h-24 sm:h-28"></div>
    </>
  );
};

export default StartAnalysisButton; 