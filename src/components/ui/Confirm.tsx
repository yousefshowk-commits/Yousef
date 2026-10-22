import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: string;
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)} size="sm">
        {opts && (
          <div className="text-center">
            <div className="animate-bounce-in mx-auto mb-3 text-6xl">{opts.icon ?? (opts.danger ? '⚠️' : '🤔')}</div>
            <h3 className="font-display mb-2 text-xl font-bold">{opts.title}</h3>
            {opts.message && <div className="mb-5 text-slate-600 dark:text-slate-300">{opts.message}</div>}
            <div className="flex gap-2">
              <Button className="flex-1" variant={opts.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                {opts.confirmText ?? 'تأكيد'}
              </Button>
              <Button className="flex-1" variant="ghost" onClick={() => close(false)}>
                {opts.cancelText ?? 'إلغاء'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
