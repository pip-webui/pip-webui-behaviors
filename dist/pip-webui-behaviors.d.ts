declare module pip.behaviors {




export interface IDraggableService {
    inputEvent(event: any): any;
}






export class ShortcutItem {
    shortcut: string;
    target?: any;
    targetId?: string;
    access?: (event: JQueryEventObject) => boolean;
    href?: string;
    url?: string;
    state?: string;
    stateParams?: any;
    event?: string;
    keypress?: (event: JQueryEventObject) => void;
    options?: ShortcutOption;
}
export class ShortcutsConfig {
    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];
    defaultOptions: ShortcutOption;
}
export interface IShortcutsService {
    readonly config: ShortcutsConfig;
    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];
    on(globalShortcuts?: ShortcutItem[], localShortcuts?: ShortcutItem[]): void;
    onLocal(localShortcuts?: ShortcutItem[]): void;
    off(): void;
}
export interface IShortcutsProvider extends ng.IServiceProvider {
    config: ShortcutsConfig;
    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];
    defaultOptions: ShortcutOption;
}

export interface IKeyboardShortcuts {
    [key: string]: Shortcut;
}
export interface IShortcutsRegisterService {
    add(shortcut: string, callback: () => void, options: ShortcutOption): void;
    remove(shortcut: string): void;
    shortcuts: IKeyboardShortcuts;
}
export interface IShortcutsRegisterProvider extends ng.IServiceProvider {
    option: ShortcutOption;
}
export class ShortcutsRegisterService implements IShortcutsRegisterService {
    private _log;
    private _defaultOption;
    private _shortcuts;
    constructor($log: ng.ILogService, option: ShortcutOption);
    private getDefaultOption();
    private checkAddShortcut(element, shorcutCombination, callback);
    readonly shortcuts: IKeyboardShortcuts;
    add(shortcut: string, callback: (e: JQueryEventObject) => void, option: ShortcutOption): void;
    remove(shorcut: string): void;
}

export class KeyboardEvent {
    static Keydown: string;
    static Keyup: string;
    static Keypress: string;
}
export class ShortcutOption {
    Type: KeyboardEvent;
    Propagate: boolean;
    DisableInInput: boolean;
    Target: any;
    Keycode: number;
}
export class Shortcut {
    private shift_nums;
    private special_keys;
    private modifiers;
    eventCallback: Function;
    target: any;
    event: KeyboardEvent;
    option: ShortcutOption;
    shorcut: string;
    callback: Function;
    constructor(element: any, shorcutCombination: string, option: ShortcutOption, callback: (e?: JQueryEventObject) => void);
}


export let ShortcutsChangedEvent: string;



}
