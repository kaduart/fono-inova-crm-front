import { toast } from "react-toastify";
import { AlertTriangle, Info, CheckCircle2, type LucideIcon } from "lucide-react";

interface ConfirmToastOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "red" | "green" | "blue" | "teal";
}

// Mesmas cores semânticas do design system do dashboard financeiro
// (vermelho/âmbar/azul/verde = red-500/amber-500/blue-500/emerald-500)
const variants: Record<string, { Icon: LucideIcon; bar: string; avatar: string; confirmBtn: string }> = {
  red: { Icon: AlertTriangle, bar: "bg-red-500", avatar: "bg-red-500", confirmBtn: "bg-red-500 hover:bg-red-600" },
  teal: { Icon: AlertTriangle, bar: "bg-amber-500", avatar: "bg-amber-500", confirmBtn: "bg-teal-600 hover:bg-teal-700" },
  blue: { Icon: Info, bar: "bg-blue-500", avatar: "bg-blue-500", confirmBtn: "bg-blue-500 hover:bg-blue-600" },
  green: { Icon: CheckCircle2, bar: "bg-emerald-500", avatar: "bg-emerald-500", confirmBtn: "bg-emerald-500 hover:bg-emerald-600" },
};

export const confirmToast = (msg: string, options: ConfirmToastOptions = {}) => {
  const {
    title = "",
    confirmText = "Excluir",
    cancelText = "Cancelar",
    confirmColor = "red",
  } = options;

  const variant = variants[confirmColor] || variants.red;

  return new Promise<boolean>((resolve) => {
    const id = toast(({ closeToast }) => (
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className={`h-[3px] ${variant.bar}`} />
        <div className="p-4 flex gap-3">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${variant.avatar}`}>
            <variant.Icon size={18} strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            {title && <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>}
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{msg}</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => { resolve(false); toast.dismiss(id); }}
                className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { resolve(true); toast.dismiss(id); }}
                className={`px-3.5 py-1.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-colors ${variant.confirmBtn}`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    ), {
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      className: "!bg-transparent !shadow-none !p-0",
      bodyClassName: "!p-0 !m-0",
    });
  });
};
