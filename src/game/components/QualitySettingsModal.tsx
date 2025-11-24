/**
 * QualitySettingsModal - UI for adjusting quality settings
 */

import { useState, useEffect } from 'react'
import { getQualityManager, QualityPreset, QualitySettings } from '../utils/qualitySettings'

interface QualitySettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function QualitySettingsModal({ isOpen, onClose }: QualitySettingsModalProps) {
  const [settings, setSettings] = useState<QualitySettings>(getQualityManager().getSettings())
  const qualityManager = getQualityManager()

  useEffect(() => {
    const unsubscribe = qualityManager.subscribe((newSettings) => {
      setSettings(newSettings)
    })
    return unsubscribe
  }, [])

  if (!isOpen) return null

  const handlePresetChange = (preset: QualityPreset) => {
    qualityManager.setPreset(preset)
  }

  const handleSettingChange = (key: keyof QualitySettings, value: any) => {
    qualityManager.updateSettings({ [key]: value })
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-gray-900 border border-cyan-500 rounded-lg p-6 max-w-md w-full mx-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400">Quality Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Preset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quality Preset
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'ultra'] as QualityPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={`px-3 py-2 rounded ${
                    settings.preset === preset
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Render Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Render Distance: {settings.renderDistance}m
            </label>
            <input
              type="range"
              min="20"
              max="100"
              value={settings.renderDistance}
              onChange={(e) => handleSettingChange('renderDistance', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Shadows */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Shadows</label>
            <input
              type="checkbox"
              checked={settings.shadows}
              onChange={(e) => handleSettingChange('shadows', e.target.checked)}
              className="w-4 h-4"
            />
          </div>

          {/* Antialiasing */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Antialiasing</label>
            <input
              type="checkbox"
              checked={settings.antialiasing}
              onChange={(e) => handleSettingChange('antialiasing', e.target.checked)}
              className="w-4 h-4"
            />
          </div>

          {/* Post Processing */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Post Processing</label>
            <input
              type="checkbox"
              checked={settings.postProcessing}
              onChange={(e) => handleSettingChange('postProcessing', e.target.checked)}
              className="w-4 h-4"
            />
          </div>

          {/* Instanced Rendering */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Instanced Rendering</label>
            <input
              type="checkbox"
              checked={settings.instancedRendering}
              onChange={(e) => handleSettingChange('instancedRendering', e.target.checked)}
              className="w-4 h-4"
            />
          </div>

          {/* Max Enemies */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Enemies: {settings.maxEnemies}
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={settings.maxEnemies}
              onChange={(e) => handleSettingChange('maxEnemies', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>
    </div>
  )
}

