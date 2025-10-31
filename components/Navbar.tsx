'use client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { IoIosMenu, IoIosClose } from 'react-icons/io';
import { LogIn, LogOut, Loader2, User, Home, PanelsTopLeft, FolderKanban, CheckSquare, UserCircle, Workflow } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { SignOut } from '@/app/actions/AuthActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/ContextApiProvider';
import { createClient } from '@/utils/supabase/client';

type ProfileRow = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};
// AppUserRow removed - users table no longer exists

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: isLoading, refreshAuth } = useAuth();

  // UI state management
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // User profile data from database
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarSalt, setAvatarSalt] = useState<number>(Date.now()); // Cache buster for avatar updates

  // Handle responsive layout based on window width
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user profile data from Supabase
  const fetchProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      // Attempt to fetch profile with username field, fallback if column doesn't exist
      let prof: ProfileRow | null = null;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', uid)
          .maybeSingle<ProfileRow>();
        if (!error) prof = data ?? null; else throw error;
      } catch {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', uid)
          .maybeSingle<any>();
        prof = data ? { username: null, full_name: data.full_name ?? null, avatar_url: data.avatar_url ?? null } : null;
      }
      setProfile(prof);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchProfile(user.id);
    else { setProfile(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Subscribe to real-time profile and user updates
  useEffect(() => {
  if (!user?.id) return;

  const profChannel = supabase
    .channel('navbar-profiles')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        const deleted = payload.eventType === 'DELETE' || !payload.new;
        if (deleted) {
          setProfile(null);
          return;
        }
        const next = payload.new as ProfileRow & { id: string };
        setProfile({
          username: (next as any).username ?? null,
          full_name: next.full_name ?? null,
          avatar_url: next.avatar_url ?? null,
        });
        setAvatarSalt(Date.now());
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(profChannel);
  };
}, [user?.id, supabase]);


  // Handle user sign out and redirect to login
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await SignOut();
      if (result?.success) {
        await refreshAuth();
        toast.success('Signed out.');
        router.push('/login');
        router.refresh();
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Workspaces', path: '/workspaces' },
    { name: 'Projects', path: '/projects' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Profile', path: '/profile' },
  ];

  // Determine display name with fallback priority: username > full_name > email
  const displayName = useMemo(
    () =>
      profile?.username?.trim() ||
      profile?.full_name?.trim() ||
      user?.email?.split('@')[0] ||
      '',
    [profile?.username, profile?.full_name, user?.email]
  );

  // Navigation item with animated underline on hover and active state
  const NavItem = ({ name, path }: { name: string; path: string }) => {
    const isActive = pathname === path;
    return (
      <div className="relative group">
        <Link
          href={path}
          className={`font-medium transition-colors ${
            isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {name === 'Home' && <Home className="w-4 h-4" />}
            {name === 'Workspaces' && <PanelsTopLeft className="w-4 h-4" />}
            {name === 'Projects' && <FolderKanban className="w-4 h-4" />}
            {name === 'Tasks' && <CheckSquare className="w-4 h-4" />}
            {name === 'Profile' && <UserCircle className="w-4 h-4" />}
            <span>{name}</span>
          </span>
        </Link>
        <span
          className={`pointer-events-none absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-200 ease-out ${
            isActive ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
        />
      </div>
    );
  };

  const AvatarChip = () => (
    <div className="flex items-center gap-3 text-foreground">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${avatarSalt}`}
          alt="Avatar"
          className="w-9 h-9 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-muted ring-1 ring-border flex items-center justify-center">
          <User className="w-4 h-4 text-foreground" />
        </div>
      )}
      <span className="text-sm font-medium hidden lg:block">
        {profileLoading ? '...' : displayName}
      </span>
    </div>
  );

  return (
    <nav className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
      scrolled ? 'top-0 w-full' : 'top-4 w-[90%]'
    }`}>
      <div className={`bg-background/95 backdrop-blur-md border border-border shadow-lg transition-all duration-300 ${
        scrolled ? 'rounded-none border-t-0 border-x-0' : 'rounded-2xl'
      }`}>
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <div className="flex justify-between items-center py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-wide text-foreground">
              <Workflow className="h-6 w-6 text-primary" />
              Flow<span className="font-bold">foundry</span>
            </Link>

            {/* Desktop */}
            {!isMobile && (
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-8">
                  {navLinks.map((l) => (
                    <NavItem key={l.name} name={l.name} path={l.path} />
                  ))}
                </div>

                {/* Right cluster */}
                <div className="flex items-center gap-4 pl-6 border-l border-border">
                  {user ? (
                    <div className="flex items-center gap-4">
                      <NotificationBell />
                      <AvatarChip />
                      <Button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        variant="outline"
                        size="sm"
                        className="border-border hover:bg-accent"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                </div>
                  ) : (
                    <Link href="/login">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border hover:bg-accent"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Mobile toggle */}
            {isMobile && (
              <div className="flex items-center gap-3">
                {user && <NotificationBell />}
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-3xl text-foreground"
                  aria-label="Toggle menu"
                >
                  {showMenu ? <IoIosClose /> : <IoIosMenu />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobile && showMenu && (
        <div className="bg-background/95 backdrop-blur-md border-t border-border">
          <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
            <div className="flex flex-col items-center gap-4 py-4">
              {navLinks.map((l) => (
                <div key={l.name} className="w-full text-center">
                  <Link
                    href={l.path}
                    onClick={() => setShowMenu(false)}
                    className={`relative inline-block text-lg font-medium ${
                      pathname === l.path ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {l.name}
                    <span
                      className={`block h-0.5 bg-primary transition-all duration-200 ease-out ${
                        pathname === l.path ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </Link>
                </div>
              ))}

              <div className="w-full pt-4 border-t border-border">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-3 text-foreground">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${avatarSalt}`}
                          alt="Avatar"
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-muted ring-1 ring-border flex items-center justify-center">
                          <User className="w-4 h-4 text-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {profileLoading ? '...' : displayName}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        handleSignOut();
                        setShowMenu(false);
                      }}
                      disabled={isSigningOut}
                      variant="outline"
                      className="w-full border-border hover:bg-accent" 
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link href="/login" onClick={() => setShowMenu(false)} className="w-full">
                    <Button className="w-full border-border hover:bg-accent" variant="outline">
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
