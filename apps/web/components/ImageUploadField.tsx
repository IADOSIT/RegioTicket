'use client';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UploadCloudIcon, XIcon } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface Props {
  label: string;
  id?: string;
  value: string;
  onChange: (url: string) => void;
  token?: string;
  hint?: string;
  placeholder?: string;
}

export function ImageUploadField({ label, id, value, onChange, token, hint, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onChange(data.url);
    } catch {
      alert('Error al subir la imagen. Verifica que el archivo sea una imagen válida (máx. 10 MB).');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'https://... o sube un archivo'}
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          title="Subir imagen desde tu dispositivo"
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          {uploading
            ? <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <UploadCloudIcon size={15} />}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" title="Quitar imagen" onClick={() => onChange('')} className="shrink-0 text-gray-400 hover:text-gray-600">
            <XIcon size={14} />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      {value && (
        <div className="mt-2">
          <img
            src={value}
            alt="Preview"
            className="h-20 max-w-full rounded-lg border border-gray-200 object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
