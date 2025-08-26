type LoadingSpinnerProps = {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  isLoading?: boolean;
  overlay?: boolean;
};

export const LoadingSpinner = ({
  size = 'medium',
  message = '',
  isLoading = false,
  overlay = false,
}: LoadingSpinnerProps) => {
  if (!isLoading) return null;

  const spinnerSize = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center 
        ${overlay ? 'fixed inset-0 bg-black bg-opacity-20 z-50' : ''}`}
    >
      <div
        className={`animate-spin rounded-full border-4 border-t-transparent border-blue-600 ${spinnerSize}`}
      />
      {message && (
        <span className={`mt-2 ${overlay ? 'text-white' : 'text-gray-600'}`}>
          {message}
        </span>
      )}
    </div>
  );
};
