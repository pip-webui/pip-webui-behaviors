declare module pip.behaviors {






export interface IKeyboardShortcuts {
    [key: string]: Shortcut;
}
export interface IShortcutBindingService {
    shortcuts: IKeyboardShortcuts;
    add(shortcut: string, callback: () => void, options: ShortcutOptions): void;
    remove(shortcut: string): void;
}
export interface IShortcutBindingProvider extends ng.IServiceProvider {
    option: ShortcutOptions;
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
    options?: ShortcutOptions;
}
export class ShortcutsConfig {
    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];
    defaultOptions: ShortcutOptions;
}
export interface IShortcutsService {
    readonly config: ShortcutsConfig;
    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];
}
export interface IShortcutsProvider extends ng.IServiceProvider {
    config: ShortcutsConfig;
    globalShortcuts: ShortcutItem[];
    defaultOptions: ShortcutOptions;
}

export class KeyboardEvent {
    static Keydown: string;
    static Keyup: string;
    static Keypress: string;
}
export class ShortcutOptions {
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
    option: ShortcutOptions;
    shorcut: string;
    callback: Function;
    constructor(element: any, shorcutCombination: string, option: ShortcutOptions, callback: (e?: JQueryEventObject) => void);
}



export let ShortcutsChangedEvent: string;



export interface IDraggableService {
    inputEvent(event: any): any;
}




}
