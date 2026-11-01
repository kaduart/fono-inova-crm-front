import type { ReactNode } from 'react';

export declare const Spinner: (props: { size?: number; light?: boolean }) => JSX.Element;
export declare const ProgressBar: (props: { value: number; className?: string }) => JSX.Element;
export declare const ModalShell: (props: { open: boolean; onClose?: () => void; labelledBy?: string; className?: string; children?: ReactNode }) => JSX.Element | null;
export declare const AnchorMenu: (props: { anchorEl: HTMLElement | null; onClose?: () => void; children?: ReactNode }) => JSX.Element | null;
export declare const MenuAction: (props: { onClick?: () => void; disabled?: boolean; className?: string; children?: ReactNode }) => JSX.Element;
