'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const AppLogo = ({ className }: { className?: string }) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('fill-current', className)}
    >
      <path d="M16.225 3.12h-8.45A4.656 4.656 0 0 0 3.12 7.775v8.45A4.656 4.656 0 0 0 7.775 20.88h8.45a4.656 4.656 0 0 0 4.655-4.655v-8.45A4.656 4.656 0 0 0 16.225 3.12zm2.81 13.105a2.81 2.81 0 0 1-2.81 2.81h-8.45a2.81 2.81 0 0 1-2.81-2.81v-8.45a2.81 2.81 0 0 1 2.81-2.81h8.45a2.81 2.81 0 0 1 2.81 2.81v8.45zM15.22 7.82h-6.44a1.8 1.8 0 0 0-1.8 1.8v4.88a1.8 1.8 0 0 0 1.8 1.8h6.44a1.8 1.8 0 0 0 1.8-1.8V9.62a1.8 1.8 0 0 0-1.8-1.8zm.36 6.68a.36.36 0 0 1-.36.36h-6.44a.36.36 0 0 1-.36-.36V9.62c0-.2.162-.36.36-.36h6.44c.2 0 .36.162.36.36v4.88z" />
    </svg>
);

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would handle authentication here
    router.push('/dashboard');
  };

  const bgImage = PlaceHolderImages.find(p => p.id === 'login-background');

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
       {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          data-ai-hint={bgImage.imageHint}
          fill
          className="object-cover -z-10 opacity-20"
        />
      )}
      <Card className="mx-auto max-w-sm w-full bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <AppLogo className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">Audit Gar</h1>
          </div>
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  defaultValue="admin@auditace.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" defaultValue="password" required />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
