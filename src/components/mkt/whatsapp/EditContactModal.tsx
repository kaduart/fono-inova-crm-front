import React, { useState } from "react";
import { Button } from "../../ui/Button";

type Props = {
  open: boolean;
  initialName?: string;
  phone?: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
};

export default function EditContactModal({ open, initialName, phone, onClose, onSave }: Props) {
  const [name, setName] = useState(initialName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSave = async () => {
    const clean = name.trim();
    if (!clean) {
      setError("Informe o nome.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(clean);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b">
          <div className="font-semibold text-gray-900">Adicionar/Editar nome</div>
          <div className="text-xs text-gray-500">{phone}</div>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ex: Maria Silva"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl"
            disabled={saving}
          >
            Cancelar
          </button>
          <Button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
