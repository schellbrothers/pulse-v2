'use client';

import React from 'react';
import Link from 'next/link';

export default function Status() {
  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#111111] text-[#ededed] p-5 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold mb-8">🦞 Pulse v2 / HBx AI Factory</h1>
          <nav className="space-y-4">
            <Link href="/" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>🏠</span>
              <span>Overview</span>
            </Link>
            <Link href="/agents" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>👥</span>
              <span>Agents</span>
            </Link>
            <Link href="/tasks" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>📋</span>
              <span>Tasks</span>
            </Link>
            <Link href="/leads" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>📞</span>
              <span>Leads</span>
            </Link>
            <Link href="/communities" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>💬</span>
              <span>Communities</span>
            </Link>
            <Link href="/calendar" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>📅</span>
              <span>Calendar</span>
            </Link>
            <Link href="/notifications" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>🔔</span>
              <span>Notifications</span>
            </Link>
            <Link href="/settings" className="flex items-center space-x-2 text-[#a1a1a1] hover:text-[#ededed]">
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
            <Link href="/status" className="flex items-center space-x-2 text-[#ededed] font-bold">
              <span>📊</span>
              <span>Status</span>
            </Link>
          </nav>
        </div>
        <footer className="text-[#a1a1a1] mt-auto">
          Schellie status footer
        </footer>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-8">System Status</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Schellie', emoji: '🦞', description: 'Orchestrator — OpenClaw on Mac Mini', status: 'Online' },
            { name: 'Nemo', emoji: '🐟', description: 'Analysis sandbox — OpenShell NemoClaw', status: 'Ready' },
            { name: 'GBR', emoji: '🪸', description: 'Execution sandbox — OpenShell', status: 'Ready' },
            { name: 'Spark', emoji: '⚡', description: 'Local inference — DGX Spark (192.168.101.178)', status: 'Ready' },
            { name: 'Supabase', emoji: '🗄️', description: 'Data plane — Postgres via Supabase', status: 'Ready' },
            { name: 'GitHub', emoji: '🐙', description: 'Source control — pulse-v2 repo', status: 'Ready' },
            { name: 'Vercel', emoji: '▲', description: 'Deployment — CI/CD pipeline', status: 'Ready' },
          ].map((system) => (
            <div key={system.name} className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-5">
              <h3 className="text-[#ededed] font-bold">{system.emoji} {system.name}</h3>
              <p className="text-[#a1a1a1] text-[12px] mb-2">{system.description}</p>
              <div className="flex items-center">
                <span
                  className={`w-3 h-3 rounded-full mr-2 ${
                    system.status === 'Online' ? 'bg-[#00c853] animate-pulse' :
                    system.status === 'Ready' ? 'bg-[#0070f3]' :
                    'bg-[#ff4444]'
                  }`}
                />
                <span className={`text-${
                  system.status === 'Online' ? '[#00c853]' :
                  system.status === 'Ready' ? '[#0070f3]' :
                  '[#ff4444]'
                }`}>
                  {system.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}