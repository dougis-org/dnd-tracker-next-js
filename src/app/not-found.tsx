import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
        </div>
      </div>
      <h1 className="text-4xl font-bold mb-2">404 - Page Not Found</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="text-primary hover:underline text-lg">
        Return to Home
      </Link>
    </div>
  );
}
