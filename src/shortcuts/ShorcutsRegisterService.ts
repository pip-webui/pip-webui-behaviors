import { Shortcut, ShortcutOption, KeyboardEvent } from "./Shortcut";

export interface IKeyboardShortcuts {
    [key: string]: Shortcut
}

export interface IShortcutsRegisterService {
    add(shortcut: string, callback: () => void, options: ShortcutOption): void;
    remove(shortcut: string): void;

    shortcuts: IKeyboardShortcuts
}

export interface IShortcutsRegisterProvider extends ng.IServiceProvider {
    option: ShortcutOption;
}

export class ShortcutsRegisterService implements IShortcutsRegisterService {
    private _log: ng.ILogService;
    private _defaultOption: ShortcutOption;
    private _shortcuts: IKeyboardShortcuts;

    public constructor(
        $log: ng.ILogService,
        option: ShortcutOption
    ) {
        "ngInject";
        this._log = $log;
        this._defaultOption = option ? _.defaults(option, this.getDefaultOption()) : this.getDefaultOption();

        this._shortcuts = {};
    }

    private getDefaultOption(): ShortcutOption {
        let defaultOption: ShortcutOption = {
            Type: KeyboardEvent.Keydown,
            Propagate: false,
            DisableInInput: false,
            Target: document,
            Keycode: null
        };

        return defaultOption;
    }

    private checkAddShortcut(element: any, shorcutCombination: string, callback: (e: JQueryEventObject) => void): boolean {
        if (!element) {
            this._log.error('Register shortcut: element undentified!');

            return false;
        }

        if (!shorcutCombination) {
            this._log.error('Register shortcut: shorcut combination undentified!');

            return false;
        }

        if (!callback) {
            this._log.error('Register shortcut: shorcut callback undentified!');

            return false;
        }

        return true;
    }

    public get shortcuts(): IKeyboardShortcuts {
        return this._shortcuts;
    }

    public add(shortcut: string, callback: (e: JQueryEventObject) => void, option: ShortcutOption): void {
        this.remove(shortcut);
        let shortcutOption: ShortcutOption = option ? _.defaults(option, this._defaultOption) : this._defaultOption;
        let shortcutCombination: string = shortcut.toLowerCase();
        let element = shortcutOption.Target;

        if (typeof shortcutOption.Target == 'string') {
            element = document.getElementById(shortcutOption.Target);
        } else {
            element = shortcutOption.Target;
        }

        if (!this.checkAddShortcut(element, shortcutCombination, callback)) {
            return
        }

        let newKeyboardShortcut = new Shortcut(element, shortcutCombination, shortcutOption, callback);

        this._shortcuts[shortcutCombination] = newKeyboardShortcut;

        //Attach the function with the event
        if (element.addEventListener) {
            element.addEventListener(shortcutOption.Type, newKeyboardShortcut.eventCallback, false);
        } else if (element.attachEvent) {
            element.attachEvent('on' + shortcutOption.Type, newKeyboardShortcut.eventCallback);
        } else {
            element.on(shortcutOption.Type, newKeyboardShortcut.eventCallback);
        }
    }

    public remove(shorcut: string): void {
        let shortcutCombination = shorcut.toLowerCase();
        let binding: Shortcut = this._shortcuts[shortcutCombination];

        delete(this._shortcuts[shortcutCombination])
        if (!binding) return;

        let type = binding.event;
        let element = binding.target;
        let callback = binding.eventCallback;

        if (element.detachEvent) {
            element.detachEvent('on' + type, callback);
        } else if (element.removeEventListener) {
            element.removeEventListener(type, callback, false);
        } else {
            // element['on' + type] = false;
            element.off(type, callback);
        }
    }
}

{
    class ShortcutsRegisterProvider implements IShortcutsRegisterProvider {
        private _service: ShortcutsRegisterService;
        private _option: ShortcutOption;

        public get option(): ShortcutOption {
            return this._option;
        }

        public set option(value: ShortcutOption) {
            this._option = value || new ShortcutOption();
        }

        public $get(
            $log: ng.ILogService
        ) {
            "ngInject";

            if (this._service == null)
                this._service = new ShortcutsRegisterService($log, this._option);

            return this._service;
        }
    }

    angular
        .module('pipShortcuts')
        .provider('pipShortcutsRegister', ShortcutsRegisterProvider);
}