'use client';

import { SignedIn, SignedOut } from "@clerk/nextjs";
import LandingHero from "@/components/LandingHero";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main>
      <SignedOut>
        <LandingHero />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}
