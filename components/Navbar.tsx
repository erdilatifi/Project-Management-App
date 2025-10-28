'use client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { IoIosMenu, IoIosClose } from 'react-icons/io';
import { LogIn, LogOut, Loader2, User, Home, PanelsTopLeft, FolderKanban } from 'lucide-react';
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
type AppUserRow = {
  username: string | null;
  display_name: string | null;
};

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: isLoading, refreshAuth } = useAuth();

  // UI state management
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // User profile data from database
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [appUser, setAppUser] = useState<AppUserRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarSalt, setAvatarSalt] = useState<number>(Date.now()); // Cache buster for avatar updates

  // Handle responsive layout based on window width
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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

      // Fetch from users table as fallback for display name
      try {
        const { data: app } = await supabase
          .from('users')
          .select('username, display_name')
          .eq('id', uid)
          .maybeSingle<AppUserRow>();
        setAppUser(app ?? null);
      } catch {
        setAppUser(null);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchProfile(user.id);
    else { setProfile(null); setAppUser(null); }
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

  const userChannel = supabase
    .channel('navbar-users')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        const deleted = payload.eventType === 'DELETE' || !payload.new;
        if (deleted) {
          setAppUser(null);
          return;
        }
        const next = payload.new as AppUserRow & { id: string };
        setAppUser({ username: (next as any).username ?? null, display_name: (next as any).display_name ?? null });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(profChannel);
    supabase.removeChannel(userChannel);
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

  // Determine display name with fallback priority: username > display_name > full_name > email
  const displayName = useMemo(
    () =>
      profile?.username?.trim() ||
      appUser?.username?.trim() ||
      appUser?.display_name?.trim() ||
      profile?.full_name?.trim() ||
      user?.email?.split('@')[0] ||
      '',
    [profile?.username, profile?.full_name, appUser?.username, appUser?.display_name, user?.email]
  );

  // Navigation item with animated underline on hover and active state
  const NavItem = ({ name, path }: { name: string; path: string }) => {
    const isActive = pathname === path;
    return (
      <div className="relative group">
        <Link
          href={path}
          className={`font-medium transition-colors ${
            isActive ? 'text-white' : 'text-neutral-200 hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1">
            {name === 'Home' && <Home className="w-4 h-4" />}
            {name === 'Workspaces' && <PanelsTopLeft className="w-4 h-4" />}
            {name === 'Projects' && <FolderKanban className="w-4 h-4" />}
            <span>{name}</span>
          </span>
        </Link>
        <span
          className={`pointer-events-none absolute -bottom-1 left-0  bg-white transition-all duration-200 ease-out ${
            isActive ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
        />
      </div>
    );
  };

  const AvatarChip = () => (
    <div className="flex items-center gap-3 text-white">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${avatarSalt}`}
          alt="Avatar"
          className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-700"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-neutral-800 ring-1 ring-neutral-700 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
      <span className="text-sm font-medium hidden lg:block">
        {profileLoading ? 'â€¦' : displayName}
      </span>
    </div>
  );

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      <div className="bg-black/90 backdrop-blur-md border-b border-neutral-700">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <div className="flex justify-between items-center py-3">
            {/* Logo */}
            <Link href="/" className="text-xl font-semibold tracking-wide text-white">
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
                <div className="flex items-center gap-4 pl-6 border-l border-neutral-700">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loadingâ€¦</span>
                    </div>
                  ) : user ? (
                    <div className="flex items-center gap-4">
                      <NotificationBell />
                      <AvatarChip />
                      <Button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        variant="outline"
                        size="sm"
                        className="bg-black text-white border border-neutral-700 hover:bg-neutral-900 hover:border-neutral-600"
                      >
                        {isSigningOut ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Signing outâ€¦
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
                        variant="outline"
                        size="sm"
                        className="bg-black text-white border border-neutral-700 hover:bg-neutral-900 hover:border-neutral-600"
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
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-3xl text-white"
                aria-label="Toggle menu"
              >
                {showMenu ? <IoIosClose /> : <IoIosMenu />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobile && showMenu && (
        <div className="bg-black/95 backdrop-blur-md border-t border-neutral-700">
          <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
            <div className="flex flex-col items-center gap-4 py-4">
              {navLinks.map((l) => (
                <div key={l.name} className="w-full text-center">
                  <Link
                    href={l.path}
                    onClick={() => setShowMenu(false)}
                    className={`relative inline-block text-lg font-medium ${
                      pathname === l.path ? 'text-white' : 'text-neutral-200 hover:text-white'
                    }`}
                  >
                    {l.name}
                    <span
                      className={`block  bg-white transition-all duration-200 ease-out ${
                        pathname === l.path ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </Link>
                </div>
              ))}

              <div className="w-full pt-4 border-t border-neutral-700">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 text-neutral-300 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loadingâ€¦</span>
                  </div>
                ) : user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-3 text-white">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${avatarSalt}`}
                          alt="Avatar"
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-neutral-800 ring-1 ring-neutral-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {profileLoading ? 'â€¦' : displayName}
                      </span>
                    </div>
                    <Button
                      onClick={() => {
                        handleSignOut();
                        setShowMenu(false);
                      }}
                      disabled={isSigningOut}
                      variant="outline"
                      className="w-full bg-black text-white border border-neutral-700 hover:bg-neutral-900 hover:border-neutral-600 " 
                    >
                      {isSigningOut ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing outâ€¦
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
                  <Link href="/login" onClick={() => setShowMenu(false)} className="w-full">
                    <Button className="w-full bg-black text-white border border-neutral-700 hover:bg-neutral-900 hover:border-neutral-600" variant="outline">
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
