/**
 * Comprehensive Settings Modal
 * Includes audio, graphics, controls, UI, and accessibility settings
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getQualityManager, QualityPreset } from '../utils/qualitySettings'
import { soundManager } from '../assets/soundManager'
import { audioTrackManager } from '../assets/audioTracks'
import EnhancedModal from './components/EnhancedModal'
import LanguageSelector from './components/LanguageSelector'
import { useTranslation } from '../hooks/useTranslation'

interface Settings {
  // Audio
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  voiceChatVolume: number
  muteAll: boolean
  
  // Graphics (from quality settings)
  qualityPreset: QualityPreset
  renderDistance: number
  shadows: boolean
  antialiasing: boolean
  postProcessing: boolean
  
  // Controls
  mouseSensitivity: number
  invertY: boolean
  touchSensitivity: number
  
  // UI
  uiScale: number
  chatOpacity: number
  showHUD: boolean
  
  // Auto-loot
  autoLootEnabled: boolean
  autoLootRange: number
  autoLootFilter: string[] // Item types to auto-loot
  
  // Accessibility
  colorblindMode: boolean
  textSize: 'small' | 'medium' | 'large'
  highContrast: boolean
}

const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  voiceChatVolume: 0.7,
  muteAll: false,
  qualityPreset: 'medium',
  renderDistance: 200,
  shadows: true,
  antialiasing: false,
  postProcessing: false,
  mouseSensitivity: 1.0,
  invertY: false,
  touchSensitivity: 1.0,
  uiScale: 1.0,
  chatOpacity: 0.9,
  showHUD: true,
  autoLootEnabled: false,
  autoLootRange: 3,
  autoLootFilter: [],
  colorblindMode: false,
  textSize: 'medium',
  highContrast: false
}

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings } = useGameStore()
  const { t } = useTranslation()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<'audio' | 'graphics' | 'controls' | 'ui' | 'accessibility'>('audio')

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gameSettings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        applySettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    } else {
      // Load from quality manager
      const qualitySettings = getQualityManager().getSettings()
      setSettings({
        ...DEFAULT_SETTINGS,
        qualityPreset: qualitySettings.preset,
        renderDistance: qualitySettings.renderDistance,
        shadows: qualitySettings.shadows,
        antialiasing: qualitySettings.antialiasing,
        postProcessing: qualitySettings.postProcessing
      })
    }
  }, [])

  // Apply settings to game systems
  const applySettings = (newSettings: Settings) => {
    // Audio
    soundManager.setMasterVolume(newSettings.masterVolume)
    soundManager.setMusicVolume(newSettings.musicVolume)
    soundManager.setEffectsVolume(newSettings.sfxVolume)
    soundManager.setEnabled(!newSettings.muteAll)
    audioTrackManager.setTrackVolume(newSettings.musicVolume)
    
    // Graphics
    const qualityManager = getQualityManager()
    qualityManager.setPreset(newSettings.qualityPreset)
    qualityManager.updateSettings({
      renderDistance: newSettings.renderDistance,
      shadows: newSettings.shadows,
      antialiasing: newSettings.antialiasing,
      postProcessing: newSettings.postProcessing
    })
    
    // Apply UI scale
    document.documentElement.style.setProperty('--ui-scale', newSettings.uiScale.toString())
    
    // Apply accessibility
    if (newSettings.highContrast) {
      document.body.classList.add('high-contrast')
    } else {
      document.body.classList.remove('high-contrast')
    }
    
    if (newSettings.colorblindMode) {
      document.body.classList.add('colorblind-mode')
    } else {
      document.body.classList.remove('colorblind-mode')
    }
    
    document.body.classList.remove('text-small', 'text-medium', 'text-large')
    document.body.classList.add(`text-${newSettings.textSize}`)
  }

  const handleSettingChange = (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    applySettings(newSettings)
    localStorage.setItem('gameSettings', JSON.stringify(newSettings))
  }

  if (!isSettingsOpen) return null

  return (
    <EnhancedModal
      isOpen={isSettingsOpen}
      onClose={toggleSettings}
      title={t('settings.title')}
      size="lg"
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          {(['audio', 'graphics', 'controls', 'ui', 'accessibility'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold transition-all ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t(`settings.${tab}`)}
            </button>
          ))}
        </div>

        {/* Audio Settings */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.masterVolume')}: {Math.round(settings.masterVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.masterVolume}
                onChange={(e) => handleSettingChange('masterVolume', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.musicVolume')}: {Math.round(settings.musicVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.musicVolume}
                onChange={(e) => handleSettingChange('musicVolume', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.sfxVolume')}: {Math.round(settings.sfxVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.sfxVolume}
                onChange={(e) => handleSettingChange('sfxVolume', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.voiceChatVolume')}: {Math.round(settings.voiceChatVolume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.voiceChatVolume}
                onChange={(e) => handleSettingChange('voiceChatVolume', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.muteAll')}</label>
              <input
                type="checkbox"
                checked={settings.muteAll}
                onChange={(e) => handleSettingChange('muteAll', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>
        )}

        {/* Graphics Settings */}
        {activeTab === 'graphics' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.qualityPreset')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'ultra'] as QualityPreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSettingChange('qualityPreset', preset)}
                    className={`px-3 py-2 rounded ${
                      settings.qualityPreset === preset
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {t(`settings.${preset}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.renderDistance')}: {settings.renderDistance}m
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={settings.renderDistance}
                onChange={(e) => handleSettingChange('renderDistance', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.shadows')}</label>
              <input
                type="checkbox"
                checked={settings.shadows}
                onChange={(e) => handleSettingChange('shadows', e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.antialiasing')}</label>
              <input
                type="checkbox"
                checked={settings.antialiasing}
                onChange={(e) => handleSettingChange('antialiasing', e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.postProcessing')}</label>
              <input
                type="checkbox"
                checked={settings.postProcessing}
                onChange={(e) => handleSettingChange('postProcessing', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>
        )}

        {/* Controls Settings */}
        {activeTab === 'controls' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.mouseSensitivity')}: {settings.mouseSensitivity.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={settings.mouseSensitivity}
                onChange={(e) => handleSettingChange('mouseSensitivity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.invertY')}</label>
              <input
                type="checkbox"
                checked={settings.invertY}
                onChange={(e) => handleSettingChange('invertY', e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.touchSensitivity')}: {settings.touchSensitivity.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.touchSensitivity}
                onChange={(e) => handleSettingChange('touchSensitivity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-4 p-3 bg-gray-800 rounded">
              <p className="text-sm text-gray-400">
                {t('settings.keybindingCustomization')}
              </p>
            </div>
          </div>
        )}

        {/* UI Settings */}
        {activeTab === 'ui' && (
          <div className="space-y-4">
            <LanguageSelector />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.uiScale')}: {settings.uiScale.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.uiScale}
                onChange={(e) => handleSettingChange('uiScale', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.chatOpacity')}: {Math.round(settings.chatOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.chatOpacity}
                onChange={(e) => handleSettingChange('chatOpacity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.showHUD')}</label>
              <input
                type="checkbox"
                checked={settings.showHUD}
                onChange={(e) => handleSettingChange('showHUD', e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-cyan-400 font-bold mb-3">{t('settings.autoLootEnabled')}</h3>
              
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">{t('settings.autoLootEnabled')}</label>
                <input
                  type="checkbox"
                  checked={settings.autoLootEnabled}
                  onChange={(e) => handleSettingChange('autoLootEnabled', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>

              {settings.autoLootEnabled && (
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('settings.autoLootRange')}: {settings.autoLootRange}m
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={settings.autoLootRange}
                      onChange={(e) => handleSettingChange('autoLootRange', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('settings.autoLootFilter')}
                    </label>
                    <div className="space-y-2">
                      {['weapon', 'armor', 'consumable', 'resource'].map(type => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.autoLootFilter.includes(type)}
                            onChange={(e) => {
                              const newFilter = e.target.checked
                                ? [...settings.autoLootFilter, type]
                                : settings.autoLootFilter.filter(t => t !== type)
                              handleSettingChange('autoLootFilter', newFilter)
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-300 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                    {settings.autoLootFilter.length === 0 && (
                      <p className="text-xs text-gray-500 mt-2">{t('settings.noFilter')}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Accessibility Settings */}
        {activeTab === 'accessibility' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.colorblindMode')}</label>
              <input
                type="checkbox"
                checked={settings.colorblindMode}
                onChange={(e) => handleSettingChange('colorblindMode', e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('settings.textSize')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSettingChange('textSize', size)}
                    className={`px-3 py-2 rounded ${
                      settings.textSize === size
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {t(`settings.${size}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{t('settings.highContrast')}</label>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => {
              setSettings(DEFAULT_SETTINGS)
              applySettings(DEFAULT_SETTINGS)
              localStorage.setItem('gameSettings', JSON.stringify(DEFAULT_SETTINGS))
            }}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            {t('settings.resetToDefaults')}
          </button>
          <button
            onClick={toggleSettings}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </EnhancedModal>
  )
}

