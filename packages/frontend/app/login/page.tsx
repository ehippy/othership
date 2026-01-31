"use client";

import Link from "next/link";

export default function LoginPage() {
  const authLoginUrl = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-8">D E R E L I C T</h1>
        <p className="text-gray-400 mb-12">Co-op survival horror</p>
        
        {authLoginUrl ? (
          <a
            href={authLoginUrl}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg transition-colors"
          >
            Login with Discord
          </a>
        ) : (
          <div className="text-red-500">
            Auth URL not configured. Set NEXT_PUBLIC_AUTH_LOGIN_URL.
          </div>
        )}
      </div>
    </div>
  );
}
