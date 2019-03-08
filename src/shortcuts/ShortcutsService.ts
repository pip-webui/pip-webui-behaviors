import { IShortcutBindingService } from "./IShortcutBindingService"
import { Shortcut, ShortcutOptions, KeyboardEvent } from "./Shortcut";
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
        private pipShortcutBinding: IShortcutBindingService
    ) {
        "ngInject";
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
            this.pipShortcutBinding.remove(k.shortcut);
        });
    }

    private keypressShortcut(item: ShortcutItem, event: JQueryEventObject) {
        if (item.access && _.isFunction(item.access)) {
            if (!item.access(event)) {
                return;
            }
        } 

        if (item.keypress) {
            item.keypress(event);
            return;
        }

        if (item.href) {
            this.$window.location.href = item.href;
            return;
        }

        if (item.url) {
            this.$location.url(item.url);
            return;
        }

        if (item.state) {
            if (this.$injector.has('$state')) {
                var $state = this.$injector.get('$state');
                $state['go'](item.state, item.stateParams);
            }
            return;
        }

        if (item.event) {
            this.$rootScope.$broadcast(item.event);
        } else {
            // Otherwise raise notification
            this.$rootScope.$broadcast('pipShortcutKeypress', item.shortcut);
        }
    }

    private addShortcuts(collection: ShortcutItem[]): void {
        let generalOptions: ShortcutOptions = this.config.defaultOptions ? this.config.defaultOptions : <ShortcutOptions>{};
        
        _.each(collection, (k) => {
            let option: ShortcutOptions = k.options ? k.options : generalOptions;
            let target: any;

            target = k.target ? k.target : k.targetId;
            if (target) { 
                option.Target = target;
            }
            // Registration of keyboard shortcut
            this.pipShortcutBinding.add(k.shortcut, (e?: any) => {
                this.keypressShortcut(k, e);        
            }, option);              
        });
    }

    // Describe public functions 
    public get config(): ShortcutsConfig {
        return this._config;
    }

    public get defaultOptions(): ShortcutOptions {
        return this._config.defaultOptions;
    }

    public set defaultOptions(value: ShortcutOptions) {
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

    public get defaultOptions(): ShortcutOptions {
        return this._config.defaultOptions;
    }

    public set defaultOptions(value: ShortcutOptions) {
        this._config.defaultOptions = value || null;
    }

    public get globalShortcuts(): ShortcutItem[] {
        return this._config.globalShortcuts;
    }

    public set globalShortcuts(value: ShortcutItem[]) {
        this._config.globalShortcuts = value || [];
    }

    public $get(
        $rootScope: ng.IRootScopeService, 
        $window: ng.IWindowService, 
        $location: ng.ILocationService, 
        $injector: ng.auto.IInjectorService,
        pipShortcutBinding: IShortcutBindingService
    ) {
        "ngInject";

        if (this._service == null)
            this._service = new ShortcutsService(this._config, $rootScope, $window, $location, $injector, pipShortcutBinding);
        
        return this._service;
    }
}

angular
    .module('pipShortcuts')
    .provider('pipShortcuts', ShortcutsProvider);

