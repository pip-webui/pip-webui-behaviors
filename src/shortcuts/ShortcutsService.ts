import { IShortcutsRegisterService } from "./ShorcutsRegisterService"
import { Shortcut, ShortcutOption, KeyboardEvent } from "./Shortcut";
import { ShortcutsConfig, ShortcutItem, IShortcutsService, IShortcutsProvider } from './IShortcutsService';

export let ShortcutsChangedEvent = 'pipShortcutsChanged';

class ShortcutsService implements IShortcutsService {
    private _oldConfig: ShortcutsConfig;
    private _config: ShortcutsConfig;

    public constructor(
        config: ShortcutsConfig,
        private $rootScope: ng.IRootScopeService,
        private $window: ng.IWindowService, 
        private $location: ng.ILocationService, 
        private $injector: ng.auto.IInjectorService,
        private pipShortcutsRegister: IShortcutsRegisterService
    ) {
        this._config = config;
        this._oldConfig = _.cloneDeep(this._config);

        // Add shortcuts
        this.addShortcuts(this._config.globalShortcuts);
        this.addShortcuts(this._config.localShortcuts);        
    }

    // Describe private functions
    private sendChangeEvent() {
        // Remove shortcuts
        this.removeShortcuts(this._oldConfig.globalShortcuts);
        this.removeShortcuts(this._oldConfig.localShortcuts);
        // Add shortcuts
        this.addShortcuts(this.config.globalShortcuts);
        this.addShortcuts(this.config.localShortcuts);

        this.$rootScope.$emit(ShortcutsChangedEvent, this.config);
        // Save current config to oldConfig
        this._oldConfig = _.cloneDeep(this.config);
    }

    private removeShortcuts(collection: ShortcutItem[]): void {
        _.each(collection, (k) => {
            this.pipShortcutsRegister.remove(k.shortcut);
        });
    }

    private keypressShortcut(shorcut: ShortcutItem, event: JQueryEventObject) {
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
            this.$window.location.href = shorcut.href;
            return;
        }

        if (shorcut.url) {
            this.$location.url(shorcut.url);
            return;
        }

        if (shorcut.state) {
            if (this.$injector.has('$state')) {
                var $state = this.$injector.get('$state');
                $state['go'](shorcut.state, shorcut.stateParams);
            }
            return;
        }

        if (shorcut.event) {
            this.$rootScope.$broadcast(shorcut.event);
        } else {
            // Otherwise raise notification
            this.$rootScope.$broadcast('pipShortcutKeypress', shorcut.shortcut);
        }
    }

    private addShortcuts(collection: ShortcutItem[]): void {
        let generalOptions: ShortcutOption = this.config.defaultOptions ? this.config.defaultOptions : <ShortcutOption>{};
        
        _.each(collection, (k) => {
            let option: ShortcutOption = k.options ? k.options : generalOptions;
            let target: any;

            target = k.target ? k.target : k.targetId;
            option.Target = target;
            // Registration of keyboard shortcut
            this.pipShortcutsRegister.add(k.shortcut, (e?: any) => {
                this.keypressShortcut(k, e);        
            }, option);              
        });
    }

    // Describe public functions 
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

    public onLocal(localShortcuts?: ShortcutItem[]): void {
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
        pipShortcutsRegister: IShortcutsRegisterService
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

