import { Shortcut, ShortcutOptions, KeyboardEvent } from "./Shortcut";
import { IKeyboardShortcuts, IShortcutBindingService, IShortcutBindingProvider } from './IShortcutBindingService';

export class ShortcutBindingService implements IShortcutBindingService {
    private _log: ng.ILogService;
    private _defaultOption: ShortcutOptions;
    private _shortcuts: IKeyboardShortcuts = {};

    public constructor(
        $log: ng.ILogService,
        option: ShortcutOptions
    ) {
        "ngInject";
        this._log = $log;
        this._defaultOption = option ? _.defaults(option, this.getDefaultOption()) : this.getDefaultOption();
    }

    private getDefaultOption(): ShortcutOptions {
        let defaultOption: ShortcutOptions = {
            Type: KeyboardEvent.Keydown,
            Propagate: false,
            DisableInInput: false,
            Target: document,
            Keycode: null
        };

        return defaultOption;
    }

    public get shortcuts(): IKeyboardShortcuts {
        return this._shortcuts;
    }

    public add(shortcut: string, callback: (e: JQueryEventObject) => void, option: ShortcutOptions): void {
        this.remove(shortcut);
        let shortcutOption: ShortcutOptions = option ? _.defaults(option, this._defaultOption) : this._defaultOption;
        let shortcutCombination: string = shortcut.toLowerCase();
        let element = shortcutOption.Target;

        if (typeof shortcutOption.Target == 'string') {
            element = document.getElementById(shortcutOption.Target);
        } else {
            element = shortcutOption.Target;
        }

        if (!element) {
            this._log.error('Register shortcut: element undentified!');
            return;
        }

        if (!shortcutCombination) {
            this._log.error('Register shortcut: shortcut combination undentified!');
            return;
        }

        if (!callback) {
            this._log.error('Register shortcut: shorcut callback undentified!');
            return;
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

class ShortcutBindingProvider implements IShortcutBindingProvider {
    private _service: ShortcutBindingService;
    private _option: ShortcutOptions;

    public get option(): ShortcutOptions {
        return this._option;
    }

    public set option(value: ShortcutOptions) {
        this._option = value || new ShortcutOptions();
    }

    public $get(
        $log: ng.ILogService
    ) {
        "ngInject";

        if (this._service == null)
            this._service = new ShortcutBindingService($log, this._option);

        return this._service;
    }
}

angular
    .module('pipShortcuts')
    .provider('pipShortcutBinding', ShortcutBindingProvider);
