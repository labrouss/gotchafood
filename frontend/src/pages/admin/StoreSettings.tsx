import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../components/ToastContainer';

export default function StoreSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['storeSettings'],
    queryFn: settingsAPI.getAll,
    enabled: !!user && user.role === 'ADMIN',
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: settingsAPI.bulkUpdate,
    onSuccess: () => {
      addToast('Settings saved successfully!');
      setEditedSettings({});
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
    },
    onError: () => addToast('Failed to save settings'),
  });

  if (!user || user.role !== 'ADMIN') {
    navigate('/');
    return null;
  }

  const grouped = data?.data?.grouped || {};
  const settings = data?.data?.settings || [];

  const handleChange = (key: string, value: any, dataType: string) => {
    let parsedValue = value;
    if (dataType === 'number') parsedValue = parseFloat(value) || 0;
    else if (dataType === 'boolean') parsedValue = value === 'true' || value === true;
    
    setEditedSettings(prev => ({ ...prev, [key]: parsedValue }));
  };

  const getValue = (setting: any) => {
    if (editedSettings[setting.key] !== undefined) return editedSettings[setting.key];
    
    // Parse current value
    if (setting.dataType === 'number') return parseFloat(setting.value);
    if (setting.dataType === 'boolean') return setting.value === 'true';
    return setting.value;
  };

  const handleSave = () => {
    const updates = Object.keys(editedSettings).map(key => ({
      key,
      value: editedSettings[key],
    }));

    if (updates.length === 0) {
      addToast('No changes to save');
      return;
    }

    bulkUpdateMutation.mutate({ settings: updates });
  };

  const renderField = (setting: any) => {
    const value = getValue(setting);

    if (setting.dataType === 'boolean') {
      return (
        <select
          value={String(value)}
          onChange={(e) => handleChange(setting.key, e.target.value, setting.dataType)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      );
    }

    if (setting.dataType === 'number') {
      return (
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => handleChange(setting.key, e.target.value, setting.dataType)}
          className="w-full border rounded-lg px-3 py-2"
        />
      );
    }

    if (setting.key.includes('color')) {
      return (
        <div className="flex gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value, setting.dataType)}
            className="h-10 w-20 border rounded-lg cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value, setting.dataType)}
            className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm"
          />
        </div>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(setting.key, e.target.value, setting.dataType)}
        className="w-full border rounded-lg px-3 py-2"
      />
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">⚙️ Store Settings</h1>
        <button
          onClick={handleSave}
          disabled={Object.keys(editedSettings).length === 0 || bulkUpdateMutation.isPending}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bulkUpdateMutation.isPending ? 'Saving...' : `Save Changes ${Object.keys(editedSettings).length > 0 ? `(${Object.keys(editedSettings).length})` : ''}`}
        </button>
      </div>

      {Object.keys(editedSettings).length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold">You have unsaved changes</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {Object.keys(grouped).map(category => (
          <div key={category} className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                {category === 'loyalty' && '🏆'}
                {category === 'theme' && '🎨'}
                {category === 'general' && '⚙️'}
                {category} Settings
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {grouped[category].map((setting: any) => (
                <div key={setting.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      {setting.label}
                    </label>
                    <p className="text-xs text-gray-500">{setting.key}</p>
                  </div>
                  <div className="md:col-span-2">
                    {renderField(setting)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {settings.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-bold mb-2">No Settings Found</h3>
          <p className="text-gray-600 mb-4">Initialize default settings to get started</p>
          <button
            onClick={() => {
              settingsAPI.initialize().then(() => {
                queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
                addToast('Default settings initialized!');
              });
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            Initialize Defaults
          </button>
        </div>
      )}
    </div>
  );
}
