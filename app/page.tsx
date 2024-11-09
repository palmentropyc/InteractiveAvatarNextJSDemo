"use client";

import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden flex items-center justify-center py-4">
        <InteractiveAvatar />
      </div>
    </div>
  );
}
