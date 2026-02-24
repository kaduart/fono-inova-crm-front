import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (!deferredPrompt || dismissed || isStandalone) return null;

    const handleInstall = async () => {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    };

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-emerald-700 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            <Download size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Instalar Fono Inova</p>
                <p className="text-xs text-emerald-200 leading-tight">Adicione à tela inicial para acesso rápido</p>
            </div>
            <button
                onClick={handleInstall}
                className="shrink-0 bg-white text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            >
                Instalar
            </button>
            <button onClick={() => setDismissed(true)} className="shrink-0 text-emerald-300 hover:text-white transition-colors">
                <X size={16} />
            </button>
        </div>
    );
}
