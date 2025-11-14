import { toast } from "react-toastify";

export const confirmToast = (msg: string) =>
  new Promise<boolean>((resolve) => {
    const id = toast(({ closeToast }) => (
      <div className="text-sm">
        <p className="font-medium text-gray-800">{msg}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => { resolve(true); toast.dismiss(id); }}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Excluir
          </button>
          <button
            onClick={() => { resolve(false); toast.dismiss(id); }}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { autoClose: false, closeOnClick: false, draggable: false });
  });
