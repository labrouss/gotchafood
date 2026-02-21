import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI, backupAPI } from '../../services/api';
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

  const { data: backups } = useQuery({
    queryKey: ['backups'],
    queryFn: backupAPI.list,
    enabled: !!user && user.role === 'ADMIN',
  });

  const createBackupMutation = useMutation({
    mutationFn: backupAPI.create,
    onSuccess: () => {
      addToast('Backup created successfully!');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => addToast('Failed to create backup'),
  });

  const restoreBackupMutation = useMutation({
    mutationFn: backupAPI.restore,
    onSuccess: () => {
      addToast('Database restored successfully!');
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      // Reload page to reflect all data changes
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (error: any) => addToast(`Restore failed: ${error.response?.data?.message || 'Unknown error'}`),
  });

  const handleDownload = async (filename: string) => {
    try {
      const blob = await backupAPI.download(filename);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      addToast('Failed to download backup');
    }
  };

  const handleRestore = (filename: string) => {
    if (confirm(`Are you sure you want to restore from ${filename}? CURRENT DATA WILL BE LOST!`)) {
      restoreBackupMutation.mutate(filename);
    }
  };


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

    bulkUpdateMutation.mutate(updates);
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
        {/* Backup & Restore Section */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              💾 Database Backup & Restore
            </h2>
            <button
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {createBackupMutation.isPending ? 'Creating Backup...' : '+ Create Backup'}
            </button>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 px-4">Filename</th>
                    <th className="pb-3 px-4">Date Created</th>
                    <th className="pb-3 px-4">Size</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {backups?.data?.backups?.map((backup: any) => (
                    <tr key={backup.filename} className="group hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{backup.filename}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {(backup.size / 1024).toFixed(2)} KB
                      </td>
                      <td className="py-3 px-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleDownload(backup.filename)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold px-2 py-1"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleRestore(backup.filename)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold px-2 py-1 border border-transparent hover:border-red-200 rounded"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!backups?.data?.backups?.length && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No backups found. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-1">ℹ️ About Restoration</p>
              Restoring a backup will <strong>replace all current data</strong> with the data from the backup file.
              This action cannot be undone. Please ensure you have a current backup before restoring an older one.
            </div>
          </div>
        </div>

        {Object.keys(grouped).map(category => (
          <div key={category} className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                {category === 'loyalty' && '🏆'}
                {category === 'theme' && '🎨'}
                {category === 'general' && '⚙️'}
                {category === 'printing' && '🖨️'}
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

              settingsAPI.initialize()
                .then((response) => {

                  queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
                  addToast('Default settings initialized!');
                })
                .catch((error) => {
                  console.error('[DEBUG] StoreSettings: Initialization failed:', error);
                  addToast('Failed to initialize settings');
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
