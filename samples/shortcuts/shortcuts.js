/* global angular */

(function () {
    'use strict';

    var thisModule = angular.module('appBehaviors.Shortcuts', ['pipShortcuts']);

    thisModule.config(function (pipShortcutsProvider) {
        console.log('appBehaviors.Shortcuts thisModule.config');
            pipShortcutsProvider.globalShortcuts = [
                { shortcut: 'ctrl+1', state: 'focused' },
                { shortcut: 'ctrl+2', state: 'selected' }
            ];
            pipShortcutsProvider.localShortcuts = [
                { shortcut: 'ctrl+3', url: '/draggable' },
                { shortcut: 'ctrl+m', 
                    keypress: () => {
                        console.log('!!!!!!!!!!! pressed ctrl+m');
                    } 
                }
            ];
        } 
    );

    thisModule.controller('ShortcutsController',
        function($scope, pipShortcutsRegister, pipShortcuts) {
            let textareaShortcut = 'shift+q';
            let documentShortcut = 'alt+g';
            let textareaOptions = { Target: 'textarea_shortcut' };

console.log('pipShortcuts.config', pipShortcuts.config);

            pipShortcutsRegister.add(textareaShortcut, (e) => {
                console.log('textareaShortcut11111111111111111111111111', e);
            }, textareaOptions);

            pipShortcutsRegister.add(documentShortcut, (e) => {
                console.log('documentShortcut22222222222222222222', e);
            });

            $scope.keyEvent = function ($event) {
                    console.log('ctrl+v pressed into textarea', $event); 
            }
        }
    );

})();
