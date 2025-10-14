'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({
    activeDrivers: 0,
    pendingDocs: 0,
    expiringDocs: 0,
    todaysBookings: 0
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <header className="bg-gray-900 text-white p-4 sticky top-0 z-50">
        <h1 className="text-xl font-bold">Walla Walla Travel</h1>
        <p className="text-sm text-gray-300">Operations Dashboard</p>
      </header>

      {/* Alert Banner */}
      {stats.expiringDocs > 0 && (
        <div className="bg-amber-600 text-white p-3">
          <p className="text-sm font-medium">
            ⚠️ {stats.expiringDocs} documents expiring soon
          </p>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
          <p className="text-gray-600 text-xs font-medium">Active Drivers</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeDrivers}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
          <p className="text-gray-600 text-xs font-medium">Pending Docs</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pendingDocs}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
          <p className="text-gray-600 text-xs font-medium">Today&apos;s Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{stats.todaysBookings}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
          <p className="text-gray-600 text-xs font-medium">Expiring Soon</p>
          <p className="text-2xl font-bold text-red-600">{stats.expiringDocs}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <button className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700">
            📋 Complete Inspection
          </button>
          <button className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700">
            📄 Upload Document
          </button>
          <button className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700">
            ⏰ Log HOS
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300">
        <div className="grid grid-cols-5 py-2">
          <button className="flex flex-col items-center py-2">
            <span className="text-2xl">🏠</span>
            <span className="text-xs text-gray-700">Home</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <span className="text-2xl">👥</span>
            <span className="text-xs text-gray-700">Drivers</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <span className="text-2xl">📄</span>
            <span className="text-xs text-gray-700">Docs</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <span className="text-2xl">🚐</span>
            <span className="text-xs text-gray-700">Fleet</span>
          </button>
          <button className="flex flex-col items-center py-2">
            <span className="text-2xl">📊</span>
            <span className="text-xs text-gray-700">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  )
}