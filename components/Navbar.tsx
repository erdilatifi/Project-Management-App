'use client';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { IoIosMenu, IoIosClose } from 'react-icons/io';

const Navbar = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Projects', path: '/projects' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Profile', path: '/profile' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-neutral-900/90 backdrop-blur-md shadow-md z-50">
      <div className="flex justify-between items-center px-6 md:px-12 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-wide text-neutral-100"
        >
          Project<span className="font-bold text-neutral-50">Manager</span>
        </Link>

        {/* Desktop Links */}
        {!isMobile && (
          <div className="flex items-center gap-6 text-neutral-300">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className="hover:text-neutral-50 transition-colors duration-200"
              >
                {link.name}
              </Link>
            ))}
          </div>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-3xl text-neutral-100 focus:outline-none"
          >
            {showMenu ? <IoIosClose /> : <IoIosMenu />}
          </button>
        )}
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobile && showMenu && (
        <div className="flex flex-col items-center gap-4 pb-6 animate-slideDown text-neutral-300">
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
        </div>
      )}
    </nav>
  );
};

export default Navbar;
