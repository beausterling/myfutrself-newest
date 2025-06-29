import { Sparkles } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary/90 to-secondary/90 z-50">
      <div className="text-center text-white">
        <Sparkles className="mx-auto h-12 w-12 animate-pulse" />
        <h2 className="mt-4 text-2xl font-semibold">Loading Your Future...</h2>
        <div className="mt-6 w-48 h-2 bg-white/20 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-white rounded-full animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;