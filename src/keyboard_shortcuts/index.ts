angular.module('pipShortcuts', ['ngMaterial', 'ui.router']);

import './ShorcutsRegisterService';
import './ShortcutsService';
import './ShortcutDirective';

export * from './ShortcutsService';
export * from './ShorcutsRegisterService';