import  {
    ShortcutOption,
} from "./KeyboardShortcut";

import  {
    IShortcutsRegisterService,
} from "./ShorcutsRegisterService";

interface ShortcutAttributes extends ng.IAttributes {
    pipShortcutAction: any;
    pipShortcutName: any;
    pipShorcutOptions: ShortcutOption;
}

class ShortcutController implements ng.IController  {
    private actionShortcuts: Function;
    private nameShortcuts: string;
    private options: ShortcutOption;

    constructor(
        $element: JQuery,
        $attrs: ShortcutAttributes,
        $scope: ng.IScope,
        $log: ng.ILogService,
        $parse: ng.IParseService,
        pipShortcutsRegister: IShortcutsRegisterService
    ) {
        "ngInject";

        if ($attrs.pipShortcutAction) {
            this.actionShortcuts = $parse($attrs.pipShortcutAction);
            this.actionShortcuts($scope, {$event: {}});
        } else {
            $log.error('Shorcunt action does not set.');

            return
        }

        if ($attrs.pipShortcutName && _.isString($attrs.pipShortcutName)) {
            this.nameShortcuts = $attrs.pipShortcutName;
        } else {
            $log.error('Shorcunt name does not set.');

            return
        }

        this.options = $attrs.pipShorcutOptions ? <ShortcutOption>$attrs.pipShorcutOptions : <ShortcutOption>{};
        this.options.Target = $element;
        // Registration of keybord shortcuts
        pipShortcutsRegister.add(this.nameShortcuts, (e?: any) => {
            this.actionShortcuts($scope, {$event: {'e': e}});          
        }, this.options);
    }

    private keypressShortcut(action) {
        this.actionShortcuts();
    }
}

// Prevent junk from going into typescript definitions
{
    const shortcutsDirective = function(): ng.IDirective {
        return {
            restrict: 'A',
            scope: false,            
            controller: ShortcutController
        };
    }

    angular
        .module('pipShortcuts')
        .directive('pipShortcut', shortcutsDirective);
}