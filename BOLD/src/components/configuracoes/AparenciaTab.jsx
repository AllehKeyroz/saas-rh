import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Palette, Upload, RefreshCw } from 'lucide-react';

const DEFAULT_CONFIG = {
  primary_color_hex: '#3b82f6',
  accent_color_hex: '#8b5cf6',
  logo_url: '',
  nome_empresa: '',
};

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(config) {
  const root = document.documentElement;
  if (config.primary_color_hex) {
    const hsl = hexToHsl(config.primary_color_hex);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
  }
  if (config.accent_color_hex) {
    const hsl = hexToHsl(config.accent_color_hex);
    root.style.setProperty('--accent', hsl);
  }
}

export default function AparenciaTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['aparencia'],
    queryFn: () => base44.entities.ConfiguracaoAparencia.list(),
  });

  useEffect(() => {
    if (configs.length > 0) {
      const cfg = configs[0];
      setExistingId(cfg.id);
      setForm({
        primary_color_hex: cfg.primary_color_hex || DEFAULT_CONFIG.primary_color_hex,
        accent_color_hex: cfg.accent_color_hex || DEFAULT_CONFIG.accent_color_hex,
        logo_url: cfg.logo_url || '',
        nome_empresa: cfg.nome_empresa || '',
      });
      applyTheme(cfg);
    }
  }, [configs]);

  const handleSave = async () => {
    setSaving(true);
    if (existingId) {
      await base44.entities.ConfiguracaoAparencia.update(existingId, form);
    } else {
      const novo = await base44.entities.ConfiguracaoAparencia.create(form);
      setExistingId(novo.id);
    }
    applyTheme(form);
    queryClient.invalidateQueries({ queryKey: ['aparencia'] });
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setUploadingLogo(false);
  };

  const handleReset = () => {
    setForm(DEFAULT_CONFIG);
    applyTheme(DEFAULT_CONFIG);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 bg-card space-y-5">
        {/* Nome da empresa */}
        <div>
          <Label className="text-sm font-medium">Nome da Empresa</Label>
          <p className="text-xs text-muted-foreground mb-2">Exibido na barra lateral do sistema</p>
          <Input
            value={form.nome_empresa}
            onChange={e => setForm(p => ({ ...p, nome_empresa: e.target.value }))}
            placeholder="Ex: Minha Empresa RH"
            className="max-w-xs"
          />
        </div>

        {/* Cores */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2"><Palette className="w-4 h-4" />Cores do Tema</Label>
          <p className="text-xs text-muted-foreground mb-3">Personalize as cores principais do sistema</p>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div>
              <Label className="text-xs">Cor Primária</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.primary_color_hex}
                  onChange={e => setForm(p => ({ ...p, primary_color_hex: e.target.value }))}
                  className="h-9 w-10 rounded border border-input cursor-pointer p-0.5"
                />
                <Input
                  value={form.primary_color_hex}
                  onChange={e => setForm(p => ({ ...p, primary_color_hex: e.target.value }))}
                  className="font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor de Destaque</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.accent_color_hex}
                  onChange={e => setForm(p => ({ ...p, accent_color_hex: e.target.value }))}
                  className="h-9 w-10 rounded border border-input cursor-pointer p-0.5"
                />
                <Input
                  value={form.accent_color_hex}
                  onChange={e => setForm(p => ({ ...p, accent_color_hex: e.target.value }))}
                  className="font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" />Logo da Empresa</Label>
          <p className="text-xs text-muted-foreground mb-2">Imagem exibida na barra lateral (PNG, JPG ou SVG)</p>
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-12 w-auto rounded border object-contain p-1 bg-white" />
            )}
            <label className="cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild disabled={uploadingLogo}>
                <span>
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingLogo ? 'Enviando...' : 'Selecionar imagem'}
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {form.logo_url && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm(p => ({ ...p, logo_url: '' }))}>
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border rounded-lg p-4 bg-card">
        <Label className="text-sm font-medium mb-3 block">Prévia</Label>
        <div className="flex gap-2 flex-wrap">
          <div className="h-8 w-24 rounded-md flex items-center justify-center text-xs text-white font-medium" style={{ backgroundColor: form.primary_color_hex }}>
            Primária
          </div>
          <div className="h-8 w-24 rounded-md flex items-center justify-center text-xs text-white font-medium" style={{ backgroundColor: form.accent_color_hex }}>
            Destaque
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4" />
          Restaurar Padrão
        </Button>
      </div>
    </div>
  );
}