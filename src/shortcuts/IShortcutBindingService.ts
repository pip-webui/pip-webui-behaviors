import { Shortcut, ShortcutOptions, KeyboardEvent } from "./Shortcut";

export interface IKeyboardShortcuts {
    [key: string]: Shortcut
}

export interface IShortcutBindingService {
    shortcuts: IKeyboardShortcuts

    add(shortcut: string, callback: () => void, options: ShortcutOptions): void;
    remove(shortcut: string): void;
}

export interface IShortcutBindingProvider extends ng.IServiceProvider {
    option: ShortcutOptions;
}