'use strict';

import  {
    ShortcutOption,
} from "./KeyboardShortcut";

import  {
    IShortcutsRegisterService,
} from "./ShorcutsRegisterService";


    // thisModule.directive('pipSelected', function ($parse, $mdConstant, $timeout) {
    //     return {
    //         restrict: 'A',
    //         scope: false,

class ShortcutController {
    private _log: ng.ILogService;

    private actionShortcuts: Function;
    private nameShortcuts: string;
    private options: ShortcutOption;

    constructor(
        $element: any,
        $attrs: any,
        $scope: ng.IScope,
        $log: ng.ILogService,
        $parse: any,
        $timeout,
        pipShortcutsRegister: IShortcutsRegisterService
    ) {
        "ngInject";
        this._log = $log;
//$parse($attrss.pipSelect)

        if ($attrs.pipShortcutAction) {
            console.log('$attrs.pipShortcutAction');
            this.actionShortcuts = $parse($attrs.pipShortcutAction);
            let a1 = $attrs.pipShortcutAction;
            this.actionShortcuts($scope, {$event: {}});
            console.log('$attrs.pipShortcutAction', a1);
        } else {
            this._log.error('Shorcunt action does not set.');

            return
        }

        if ($attrs.pipShortcutName && _.isString($attrs.pipShortcutName)) {
            this.nameShortcuts = $attrs.pipShortcutName;
        } else {
            this._log.error('Shorcunt name does not set.');

            return
        }

        this.options = $attrs.pipShorcutOptions ? <ShortcutOption>$attrs.pipShorcutOptions : <ShortcutOption>{};
        this.options.Target = $element;
        // regester keyboard shortcut
        pipShortcutsRegister.add(this.nameShortcuts, (e?: any) => {
            this.actionShortcuts($scope, {$event: {'e': e}});          
        }, this.options);

        $timeout(() => {
            pipShortcutsRegister.remove(this.nameShortcuts);
            console.log('shortcut removed');
        }, 100000)
    }

    private keypressShortcut(action) {
        this.actionShortcuts();
    }
}

// Prevent junk from going into typescript definitions
(() => {

    function shortcutsDirective($parse) {
        return {
            restrict: 'A',
            scope: false,            
            controller: ShortcutController
        };
    }


    angular
        .module('pipShortcuts')
        .directive('pipShortcut', shortcutsDirective);
})();