'use strict';


import {
    ShortcutsRegister
} from "./ShorcutsRegisterService"
import  {
    KeyboardShortcut,
    ShortcutOption,
    KeyboardEvent
} from "./KeyboardShortcut";

export let ShortcutsChangedEvent = 'pipShortcutsChanged';

export class SimpleShortcutItem {
    // Shortcut combination
    public shortcut: string;
    // target object 
    public target?: any;
    // target element by Id
    public targetId?: string;
    // // target element by class (firstelement??)
    // public targetClass?: string;
    // Access function
    public access?: (event: JQueryEventObject) => boolean;
    // window.location.href
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
    // default options
    public options?: ShortcutOption;    
}

export class ShortcutItem extends SimpleShortcutItem {
    public shortcuts: SimpleShortcutItem[];
}

export class ShortcutsConfig {
    // Global shortcut 
    public globalShortcuts: ShortcutItem[] = [];
    // Local shortcut 
    public localShortcuts: ShortcutItem[] = [];
    // default options
    public defaultOptions: ShortcutOption = null;
}

export interface IShortcutsService {
    readonly config: ShortcutsConfig;

    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];

    on(globalShortcuts?: ShortcutItem[], localShortcuts?: ShortcutItem[]): void;
    off(): void;
}

export interface IShortcutsProvider extends ng.IServiceProvider {
    config: ShortcutsConfig;
    
    globalShortcuts: ShortcutItem[];
    localShortcuts: ShortcutItem[];
    defaultOptions: ShortcutOption;
}

class ShortcutsService implements IShortcutsService {
    private _config: ShortcutsConfig;
    private _oldConfig: ShortcutsConfig;
    private _rootScope: ng.IRootScopeService;
    private _window: ng.IWindowService;
    private _location: ng.ILocationService;
    private _injector: ng.auto.IInjectorService;    
    private _pipShortcutsRegister: ShortcutsRegister;

    public constructor(
        config: ShortcutsConfig,
        $rootScope: ng.IRootScopeService,
        $window: ng.IWindowService, 
        $location: ng.ILocationService, 
        $injector: ng.auto.IInjectorService,
        pipShortcutsRegister: ShortcutsRegister
    ) {
        this._config = config;
        this._oldConfig = _.cloneDeep(this._config);
        this._rootScope = $rootScope;
        this._window = $window;
        this._location = $location;
        this._injector = $injector;    
        this._pipShortcutsRegister = pipShortcutsRegister;

        // add shortcuts
        this.addShortcuts(this._config.globalShortcuts);
        this.addShortcuts(this._config.localShortcuts);        
    }

    // private declaration 
    private sendChangeEvent() {
        // remove shortcuts
        this.removeShortcuts(this._oldConfig.globalShortcuts);
        this.removeShortcuts(this._oldConfig.localShortcuts);
        // add shortcuts
        this.addShortcuts(this._config.globalShortcuts);
        this.addShortcuts(this._config.localShortcuts);

        this._rootScope.$emit(ShortcutsChangedEvent, this._config);
        // save current config to oldConfig
        this._oldConfig = _.cloneDeep(this._config);
    }

    private removeShortcuts(collection: ShortcutItem[]): void {
        _.each(collection, (k) => {
            this._pipShortcutsRegister.remove(k.shortcut);
        });
    }

    private keypressShortcut(shorcut: SimpleShortcutItem, event: JQueryEventObject) {
        if (shorcut.access && _.isFunction(shorcut.access)) {
            if (!shorcut.access(event)) {
                return;
            }
        } 

        if (shorcut.keypress) {
            shorcut.keypress(event);
            return;
        }

        if (shorcut.href) {
            this._window.location.href = shorcut.href;
            return;
        }

        if (shorcut.url) {
            this._location.url(shorcut.url);
            return;
        }

        if (shorcut.state) {
            if (this._injector.has('$state')) {
                var $state = this._injector.get('$state');
                $state['go'](shorcut.state, shorcut.stateParams);
            }
            return;
        }

        if (shorcut.event) {
            this._rootScope.$broadcast(shorcut.event);
        } else {
            // Otherwise raise notification
            this._rootScope.$broadcast('pipShortcutKeypress', shorcut.shortcut);
        }
    }

    private addShortcuts(collection: ShortcutItem[]): void {
        let generalOptions: ShortcutOption = this._config.defaultOptions ? this._config.defaultOptions : <ShortcutOption>{};
        
        _.each(collection, (k) => {
            let option: ShortcutOption = k.options ? k.options : generalOptions;
            let target: any;

            target = k.target ? k.target : k.targetId;
            option.Target = target;
            // regester keyboard shortcut
            this._pipShortcutsRegister.add(k.shortcut, (e?: any) => {
                this.keypressShortcut(k, e);        
            }, option);              
        });
    }

    // public declaration 

    public get config(): ShortcutsConfig {
        return this._config;
    }

    public get defaultOptions(): ShortcutOption {
        return this._config.defaultOptions;
    }

    public set defaultOptions(value: ShortcutOption) {
        this._config.defaultOptions = value || null;
        this.sendChangeEvent();
    }

    public get globalShortcuts(): ShortcutItem[] {
        return this._config.globalShortcuts;
    }

    public set globalShortcuts(value: ShortcutItem[]) {
        this._config.globalShortcuts = value || [];
        this.sendChangeEvent();
    }

    public get localShortcuts(): ShortcutItem[] {
        return this._config.localShortcuts;
    }

    public set localShortcuts(value: ShortcutItem[]) {
        this._config.localShortcuts = value || [];
        this.sendChangeEvent();
    }

    public on(globalShortcuts?: ShortcutItem[], localShortcuts?: ShortcutItem[]): void {
        if (globalShortcuts && _.isArray(globalShortcuts)) {
            this._config.globalShortcuts = globalShortcuts;    
        }
        if (localShortcuts && _.isArray(localShortcuts)) {
            this._config.localShortcuts = localShortcuts;    
        }        

        this.sendChangeEvent();
    }

    public off(): void {
        this._config.globalShortcuts = [];
        this._config.localShortcuts = [];
        this.sendChangeEvent();
    }
}

class ShortcutsProvider implements IShortcutsProvider {
    private _config: ShortcutsConfig = new ShortcutsConfig();
    private _service: ShortcutsService;

    public get config(): ShortcutsConfig {
        return this._config;
    }

    public set config(value: ShortcutsConfig) {
        this._config = value || new ShortcutsConfig();
    }

    public get defaultOptions(): ShortcutOption {
        return this._config.defaultOptions;
    }

    public set defaultOptions(value: ShortcutOption) {
        this._config.defaultOptions = value || null;
    }

    public get globalShortcuts(): ShortcutItem[] {
        return this._config.globalShortcuts;
    }

    public set globalShortcuts(value: ShortcutItem[]) {
        this._config.globalShortcuts = value || [];
    }

    public get localShortcuts(): ShortcutItem[] {
        return this._config.localShortcuts;
    }

    public set localShortcuts(value: ShortcutItem[]) {
        this._config.localShortcuts = value || [];
    }

    public $get(
        $rootScope: ng.IRootScopeService, 
        $window: ng.IWindowService, 
        $location: ng.ILocationService, 
        $injector: ng.auto.IInjectorService,
        pipShortcutsRegister: ShortcutsRegister
    ) {
        "ngInject";

        if (this._service == null)
            this._service = new ShortcutsService(this._config, $rootScope, $window, $location, $injector, pipShortcutsRegister);
        
        return this._service;
    }
}

angular
    .module('pipShortcuts')
    .provider('pipShortcuts', ShortcutsProvider);

