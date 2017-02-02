'use strict';

import  {
    KeyboardShortcut,
    ShortcutOption,
    KeyboardEvent
} from "./KeyboardShortcut";

export interface IKeyboardShortcuts {
    [key: string]: KeyboardShortcut
}

export interface IShortcutsRegisterService {
    add(shorcutName: string, callback: () => void, options: ShortcutOption): void;
    remove(shorcutName: string): void;

    shorcuts: IKeyboardShortcuts
}

export interface IShortcutsRegisterProvider extends ng.IServiceProvider {
    option: ShortcutOption;
}

export class ShortcutsRegister implements IShortcutsRegisterService {
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
            // todo generate error
            return false;
        }

        if (!shorcutCombination) {
            // todo generate error
            return false;
        }

        if (!callback) {
            // todo generate error
            return false;
        }

        return true;
    }

    public get shorcuts(): IKeyboardShortcuts {
        return this._shortcuts;
    }

    public add(shorcutName: string, callback: (e: JQueryEventObject) => void, option: ShortcutOption): void {
        console.log('add', shorcutName, callback, option);
        let shorcutOption: ShortcutOption = option ? _.defaults(option, this._defaultOption) : this._defaultOption;
        let shorcutCombination: string = shorcutName.toLowerCase();
        let element = shorcutOption.Target;


        if (typeof shorcutOption.Target == 'string') {
            element = document.getElementById(shorcutOption.Target);
        } else {
            element = shorcutOption.Target;
        }

        if (!this.checkAddShortcut(element, shorcutCombination, callback)) {
            
            return
        }

        let newKeyboardShortcut = new KeyboardShortcut(element, shorcutCombination, shorcutOption, callback);

		this._shortcuts[shorcutCombination] = newKeyboardShortcut;

		//Attach the function with the event
		if (element.addEventListener) { 
            element.addEventListener(shorcutOption.Type, newKeyboardShortcut.eventCallback, false);
        } else if (element.attachEvent) { 
            element.attachEvent('on' + shorcutOption.Type, newKeyboardShortcut.eventCallback);
        } else { 
            element.on(shorcutOption.Type, newKeyboardShortcut.eventCallback); 
        }
    }

    public remove(shorcutName: string): void {
		let shortcutCombination = shorcutName.toLowerCase();
		let binding: KeyboardShortcut = this._shortcuts[shortcutCombination];

        console.log('remove', shorcutName, this._shortcuts[shortcutCombination]);
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

        console.log('remove1', shorcutName, this._shortcuts[shortcutCombination]);
    }
}



class ShortcutsRegisterProvider implements IShortcutsRegisterProvider {
    private _service: ShortcutsRegister;
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
            this._service = new ShortcutsRegister($log, this._option);

        return this._service;
    }
}

angular
    .module('pipShortcuts')
    .provider('pipShortcutsRegister', ShortcutsRegisterProvider);
