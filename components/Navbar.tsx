'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoIosMenu, IoIosClose } from 'react-icons/io';
import { LogIn, LogOut, Loader2, User } from 'lucide-react';
import { SignOut } from '@/app/actions/AuthActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/ContextApiProvider';

const Navbar = () => {
  const router = useRouter();
  const { user, loading: isLoading, refreshAuth } = useAuth();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await SignOut();
      if (result?.success) {
        // Refresh auth context to immediately update navbar
        await refreshAuth();
        toast.success('Successfully signed out!');
        router.push('/login');
        router.refresh();
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Projects', path: '/projects' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Profile', path: '/profile' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-neutral-900/95 backdrop-blur-md shadow-lg border-b border-neutral-800 z-50">
      <div className="flex justify-between items-center px-6 md:px-12 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-wide text-neutral-100 hover:text-white transition-colors"
        >
          Project<span className="font-bold text-blue-400">Manager</span>
        </Link>

        {/* Desktop Links */}
        {!isMobile && (
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-neutral-300">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  className="hover:text-neutral-50 transition-colors duration-200 font-medium"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-neutral-700">
              {isLoading ? (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-medium hidden lg:block">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    variant="outline"
                    size="sm"
                    className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 text-neutral-200"
                  >
                    {isSigningOut ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-3xl text-neutral-100 focus:outline-none hover:text-white transition-colors"
          >
            {showMenu ? <IoIosClose /> : <IoIosMenu />}
          </button>
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobile && showMenu && (
        <div className="flex flex-col items-center gap-4 pb-6 pt-2 animate-slideDown text-neutral-300 bg-neutral-900/95 border-t border-neutral-800">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={() => setShowMenu(false)}
              className="text-lg font-medium hover:text-neutral-50 transition-colors duration-200"
            >
              {link.name}
            </Link>
          ))}
          
          {/* Mobile Auth Buttons */}
          <div className="w-full px-6 pt-4 border-t border-neutral-800 mt-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-neutral-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-neutral-300 py-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-medium">{user.email?.split('@')[0]}</span>
                </div>
                <Button
                  onClick={() => {
                    handleSignOut();
                    setShowMenu(false);
                  }}
                  disabled={isSigningOut}
                  variant="outline"
                  className="w-full bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-200"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setShowMenu(false)} className="block">
                <Button
                  variant="default"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
