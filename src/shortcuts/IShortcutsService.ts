import { ShortcutOptions } from "./Shortcut";

export class ShortcutItem {
    // Shortcut combination
    public shortcut: string;
    // Target object 
    public target?: any;
    // Target element by Id
    public targetId?: string;
    // Target element by class (firstelement??)
    // Public targetClass?: string;
    // Access function
    public access?: (event: JQueryEventObject) => boolean;
    // Window.location.href
    public href?: string;
    // $location.url
    public url?: string;
    // $state.go(state, stateParams)
    public state?: string;
    // Parameters for $state.go(state, stateParams)
    public stateParams?: any;
    // $rootScope.broadcast(event)
    public event?: string;
    // Click callback
    public keypress?: (event: JQueryEventObject) => void;
    // Default options
    public options?: ShortcutOptions;    
}

// export class ShortcutItem extends SimpleShortcutItem {
//     public shortcuts: SimpleShortcutItem[];
// }

export class ShortcutsConfig {
    // Global shortcut 
    public globalShortcuts: ShortcutItem[] = [];
    // Local shortcut 
    public localShortcuts: ShortcutItem[] = [];
    // Default options
    public defaultOptions: ShortcutOptions = null;
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
